import { describe, expect, test } from "bun:test";

import { MoodleAuthError } from "@/lib/moodle/errors";
import {
  handleAssignmentSubmissionRequest,
  type SubmissionRequestDependencies,
} from "@/lib/moodle/submission/http";

function request(origin: string): Request {
  return new Request("https://app.example/api/assignments/9101/submission", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data; boundary=fixture",
      host: "app.example",
      origin,
      "sec-fetch-site": origin === "https://app.example" ? "same-origin" : "cross-site",
    },
    body: "--fixture--",
  });
}

describe("assignment submission HTTP boundary", () => {
  test("rejects cross-site mutation before loading the session", async () => {
    // Given
    let loaded = false;
    const dependencies: SubmissionRequestDependencies = {
      loadContext: async () => {
        loaded = true;
        throw new MoodleAuthError();
      },
      now: () => 1_800_000_000,
    };

    // When
    const response = await handleAssignmentSubmissionRequest(
      request("https://evil.invalid"),
      "9101",
      dependencies,
    );

    // Then
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "origin_rejected" },
    });
    expect(loaded).toBe(false);
  });

  test("returns a redacted authentication failure for an expired session", async () => {
    // Given
    const dependencies: SubmissionRequestDependencies = {
      loadContext: async () => {
        throw new MoodleAuthError();
      },
      now: () => 1_800_000_000,
    };

    // When
    const response = await handleAssignmentSubmissionRequest(
      request("https://app.example"),
      "9101",
      dependencies,
    );

    // Then
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "authentication_failed" },
    });
  });

  test.each(["0", "-1", "1e3", "abc", "999999999999"])(
    "rejects malformed branded CMID %s",
    async (cmid) => {
      // Given
      let loaded = false;
      const dependencies: SubmissionRequestDependencies = {
        loadContext: async () => {
          loaded = true;
          throw new MoodleAuthError();
        },
        now: () => 1_800_000_000,
      };

      // When
      const response = await handleAssignmentSubmissionRequest(
        request("https://app.example"),
        cmid,
        dependencies,
      );

      // Then
      expect(response.status).toBe(400);
      expect(loaded).toBe(false);
    },
  );
});
