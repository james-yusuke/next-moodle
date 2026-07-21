import { describe, expect, test } from "bun:test";
import { getIronSession } from "iron-session";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { createSessionOptions } from "../../lib/auth/session";
import {
  MoodleSessionSchema,
  MoodleTokenSchema,
  MoodleUserIdSchema,
  type MoodleSession,
} from "../../lib/moodle/model";

type SessionContainer = {
  moodle?: MoodleSession;
};

class MemoryCookieStore {
  readonly #values = new Map<string, string>();
  #lastOptions: Partial<ResponseCookie> | undefined;

  get(name: string): { readonly name: string; readonly value: string } | undefined {
    const value = this.#values.get(name);
    return value === undefined ? undefined : { name, value };
  }

  set(name: string, value: string, options?: Partial<ResponseCookie>): void;
  set(options: ResponseCookie): void;
  set(
    nameOrOptions: string | ResponseCookie,
    value?: string,
    options?: Partial<ResponseCookie>,
  ): void {
    if (typeof nameOrOptions !== "string") {
      this.#values.set(nameOrOptions.name, nameOrOptions.value);
      this.#lastOptions = nameOrOptions;
      return;
    }
    if (value !== undefined) {
      this.#values.set(nameOrOptions, value);
      this.#lastOptions = options;
    }
  }

  value(name: string): string | null {
    return this.#values.get(name) ?? null;
  }

  options(): Partial<ResponseCookie> | undefined {
    return this.#lastOptions;
  }
}

const options = createSessionOptions(
  "fixture-session-password-at-least-32-bytes",
);

function fixtureSession(token: string, userId: number): MoodleSession {
  return MoodleSessionSchema.parse({
    token: MoodleTokenSchema.parse(token),
    service: "fixture_service",
    userId: MoodleUserIdSchema.parse(userId),
    expiresAt: Date.now() + 60_000,
    site: {
      siteName: "Example Learning Hub",
      siteUrl: "https://moodle.example",
      availableFunctions: [],
    },
    capabilities: {
      dashboard: false,
      courses: false,
      assignments: false,
      calendar: false,
      notifications: false,
      fileUpload: false,
    },
  });
}

describe("iron-session Moodle cookie", () => {
  test("encrypts each user's token into an isolated secure cookie", async () => {
    // Given
    const firstStore = new MemoryCookieStore();
    const secondStore = new MemoryCookieStore();
    const first = await getIronSession<SessionContainer>(firstStore, options);
    const second = await getIronSession<SessionContainer>(secondStore, options);
    first.moodle = fixtureSession("fixture-user-a", 41);
    second.moodle = fixtureSession("fixture-user-b", 42);

    // When
    await Promise.all([first.save(), second.save()]);
    const firstReloaded = await getIronSession<SessionContainer>(
      firstStore,
      options,
    );
    const secondReloaded = await getIronSession<SessionContainer>(
      secondStore,
      options,
    );

    // Then
    expect(firstReloaded.moodle?.userId).toBe(MoodleUserIdSchema.parse(41));
    expect(secondReloaded.moodle?.userId).toBe(MoodleUserIdSchema.parse(42));
    expect(firstStore.value(options.cookieName)).not.toContain("fixture-user-a");
    expect(secondStore.value(options.cookieName)).not.toContain("fixture-user-b");
    expect(firstStore.options()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
