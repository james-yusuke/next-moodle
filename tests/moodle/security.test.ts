import { describe, expect, test } from "bun:test";

import {
  AuthRequestError,
  readLoginCredentials,
} from "../../lib/auth/login-input";
import {
  assertSameOrigin,
  SameOriginError,
} from "../../lib/auth/same-origin";
import {
  createSessionOptions,
  parseActiveMoodleSession,
  readSessionOptions,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "../../lib/auth/session";
import {
  MoodleTokenSchema,
  MoodleUserIdSchema,
} from "../../lib/moodle/model";
import { createSessionFixture } from "./session-fixture";

const SESSION_PASSWORD = "fixture-session-password-at-least-32-bytes";

describe("authentication request security", () => {
  test("rejects a cross-origin mutation before handling it", () => {
    // Given
    const request = new Request("https://cockpit.example/api/auth/logout", {
      method: "POST",
      headers: {
        host: "cockpit.example",
        origin: "https://attacker.example",
      },
    });

    // When
    const action = () => assertSameOrigin(request);

    // Then
    expect(action).toThrow(SameOriginError);
  });

  test("accepts an exact same-origin mutation", () => {
    // Given
    const request = new Request("https://cockpit.example/api/auth/login", {
      method: "POST",
      headers: {
        host: "cockpit.example",
        origin: "https://cockpit.example",
      },
    });

    // When
    const action = () => assertSameOrigin(request);

    // Then
    expect(action).not.toThrow();
  });

  test("accepts the public Host origin when Next uses an internal URL host", () => {
    // Given
    const request = new Request("http://localhost:32131/api/auth/login", {
      method: "POST",
      headers: {
        host: "127.0.0.1:32131",
        origin: "http://127.0.0.1:32131",
      },
    });

    // When
    const action = () => assertSameOrigin(request);

    // Then
    expect(action).not.toThrow();
  });

  test("uses the required encrypted-cookie policy", () => {
    // Given
    const options = createSessionOptions(SESSION_PASSWORD);

    // When
    const cookie = options.cookieOptions;

    // Then
    expect(options.ttl).toBe(8 * 60 * 60);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  test("uses an insecure cookie only for the local Playwright development harness", () => {
    // Given
    const environment = {
      SESSION_PASSWORD,
      NODE_ENV: "development",
      NEXT_MOODLE_E2E_INSECURE_COOKIE: "1",
    };

    // When
    const options = readSessionOptions(environment);

    // Then
    expect(options.cookieOptions?.secure).toBe(false);
    expect(options.cookieName).not.toBe(SESSION_COOKIE_NAME);
  });

  test("keeps cookies secure when a production deployment has the E2E flag", () => {
    // Given
    const environment = {
      SESSION_PASSWORD,
      NODE_ENV: "production",
      NEXT_MOODLE_E2E_INSECURE_COOKIE: "1",
    };

    // When
    const options = readSessionOptions(environment);

    // Then
    expect(options.cookieOptions?.secure).toBe(true);
  });

  test("rejects an expired decrypted session", () => {
    // Given
    const now = 1_800_000_000_000;
    const expired = createSessionFixture({
      expiresAt: now - 1,
      token: MoodleTokenSchema.parse("fixture-token"),
      userId: MoodleUserIdSchema.parse(41),
    });

    // When
    const active = parseActiveMoodleSession(expired, now);

    // Then
    expect(active).toBeNull();
    expect(SESSION_TTL_SECONDS).toBe(28_800);
  });

  test("rejects malformed login JSON without echoing its contents", async () => {
    // Given
    const request = new Request("https://cockpit.example/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"password":"untrusted',
    });

    // When
    const outcome = readLoginCredentials(request);

    // Then
    await expect(outcome).rejects.toBeInstanceOf(AuthRequestError);
    await expect(outcome).rejects.toMatchObject({
      message: "Authentication request is invalid.",
    });
  });
});
