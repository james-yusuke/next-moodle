type TimerId = number;

export type NotificationPollerOptions = Readonly<{
  cancel: (id: TimerId) => void;
  fetchNotifications: (signal: AbortSignal) => Promise<void>;
  isVisible: () => boolean;
  onError?: (error: Error) => void;
  schedule: (
    callback: () => void,
    delay: number,
  ) => TimerId;
  intervalMs?: number;
}>;

export type NotificationPoller = Readonly<{
  setVisible: (visible: boolean) => void;
  start: () => void;
  stop: () => void;
}>;

const DEFAULT_INTERVAL_MS = 60_000;

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error("Notification polling failed.");
}

function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError";
}

export function createNotificationPoller(
  options: NotificationPollerOptions,
): NotificationPoller {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  let started = false;
  let visible = options.isVisible();
  let timer: TimerId | undefined;
  let controller: AbortController | undefined;

  const schedule = (): void => {
    if (!started || !visible || timer !== undefined || controller !== undefined) {
      return;
    }
    timer = options.schedule(() => {
      timer = undefined;
      void run();
    }, intervalMs);
  };

  const run = async (): Promise<void> => {
    if (!started || !visible || controller !== undefined) {
      schedule();
      return;
    }
    const nextController = new AbortController();
    controller = nextController;
    try {
      await options.fetchNotifications(nextController.signal);
    } catch (error) {
      if (!isAbortError(error)) {
        options.onError?.(toError(error));
      }
    } finally {
      if (controller === nextController) {
        controller = undefined;
      }
      schedule();
    }
  };

  const cancelTimer = (): void => {
    if (timer !== undefined) {
      options.cancel(timer);
      timer = undefined;
    }
  };

  return {
    start: (): void => {
      if (started) {
        return;
      }
      started = true;
      schedule();
    },
    stop: (): void => {
      started = false;
      cancelTimer();
      controller?.abort();
      controller = undefined;
    },
    setVisible: (nextVisible: boolean): void => {
      visible = nextVisible;
      if (!visible) {
        cancelTimer();
        controller?.abort();
        return;
      }
      schedule();
    },
  };
}
