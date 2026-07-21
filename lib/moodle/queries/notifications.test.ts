import { describe, expect, mock, test } from "bun:test";

import { createMoodleConfig } from "../config";
import { MoodleClient } from "../client";
import {
  MoodleNotificationIdSchema,
  MoodleTokenSchema,
  MoodleUserIdSchema,
} from "../identifiers";
import { createMoodleMock } from "../../../mock/moodle-server";

mock.module("server-only", () => ({}));

describe("Moodle notification query", () => {
  test("keeps read mutation and two-user data isolated", async () => {
    // Given
    const { loadNotifications, markNotificationRead } = await import("./notifications");
    const mockServer = createMoodleMock();
    const server = await mockServer.start();
    const config = createMoodleConfig({ baseUrl: server.url, timeoutMs: 500 });
    const alice = new MoodleClient({
      config,
      token: MoodleTokenSchema.parse(server.tokenFor("alice")),
    });
    const bob = new MoodleClient({
      config,
      token: MoodleTokenSchema.parse(server.tokenFor("bob")),
    });

    try {
      // When
      const before = await loadNotifications(
        alice,
        MoodleUserIdSchema.parse(101),
        server.url,
      );
      await markNotificationRead(
        alice,
        MoodleNotificationIdSchema.parse(701),
      );
      const after = await loadNotifications(
        alice,
        MoodleUserIdSchema.parse(101),
        server.url,
      );
      const bobData = await loadNotifications(
        bob,
        MoodleUserIdSchema.parse(202),
        server.url,
      );

      // Then
      expect(before.unreadCount).toBe(1);
      expect(after.unreadCount).toBe(0);
      expect(after.notifications).toHaveLength(0);
      expect(bobData.unreadCount).toBe(1);
      expect(bobData.notifications[0]?.subject).toBe("Course announcement");
    } finally {
      await mockServer.stop();
    }
  });
});
