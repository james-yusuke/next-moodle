import { describe, expect, test } from "bun:test";

import { createNotificationPoller } from "./polling";

type Timer = { readonly callback: () => void; readonly delay: number };

function fakeTimers() {
  const timers: Timer[] = [];
  return {
    timers,
    schedule(callback: () => void, delay: number): number {
      timers.push({ callback, delay });
      return timers.length - 1;
    },
    cancel(id: number): void {
      timers[id] = { callback: () => undefined, delay: -1 };
    },
  };
}

describe("notification poller", () => {
  test("waits 60 seconds while visible and never overlaps requests", async () => {
    // Given
    const clock = fakeTimers();
    let visible = true;
    let calls = 0;
    let release: (() => void) | undefined;
    const poller = createNotificationPoller({
      isVisible: () => visible,
      schedule: clock.schedule,
      cancel: clock.cancel,
      fetchNotifications: async () => {
        calls += 1;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    });

    // When
    poller.start();
    clock.timers[0]?.callback();
    clock.timers.push({ callback: () => undefined, delay: -1 });
    clock.timers[1]?.callback();

    // Then
    expect(calls).toBe(1);
    expect(clock.timers[0]?.delay).toBe(60_000);
    expect(clock.timers[1]?.delay).toBe(-1);

    release?.();
    await Promise.resolve();
    poller.stop();
    visible = false;
  });

  test("cancels in-flight work when the document becomes hidden", () => {
    // Given
    const clock = fakeTimers();
    let visible = true;
    let aborted = false;
    const poller = createNotificationPoller({
      isVisible: () => visible,
      schedule: clock.schedule,
      cancel: clock.cancel,
      fetchNotifications: async (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
      },
    });

    // When
    poller.start();
    clock.timers[0]?.callback();
    visible = false;
    poller.setVisible(false);

    // Then
    expect(aborted).toBe(true);
    poller.stop();
  });
});
