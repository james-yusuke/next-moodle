import { describe, expect, test } from "bun:test";

import {
  filterNotifications,
  safeNotificationHref,
  type NotificationView,
} from "./notifications-schema";
import { MoodleNotificationIdSchema } from "../identifiers";

const notification = (overrides: Partial<NotificationView> = {}): NotificationView => ({
  id: MoodleNotificationIdSchema.parse(701),
  subject: "Feedback",
  message: "Your field notes are ready.",
  timeCreated: 1_735_689_600,
  read: false,
  href: "/mod/assign/view.php?id=9101",
  ...overrides,
});

describe("notification projection", () => {
  test("filters unread and all views without mutating the source", () => {
    // Given
    const source = [
      notification(),
      notification({ id: MoodleNotificationIdSchema.parse(702), read: true }),
    ];

    // When
    const unread = filterNotifications(source, "unread");
    const all = filterNotifications(source, "all");

    // Then
    expect(unread.map((item) => item.id)).toEqual([
      MoodleNotificationIdSchema.parse(701),
    ]);
    expect(all.map((item) => item.id)).toEqual([
      MoodleNotificationIdSchema.parse(701),
      MoodleNotificationIdSchema.parse(702),
    ]);
    expect(source.map((item) => item.id)).toEqual([
      MoodleNotificationIdSchema.parse(701),
      MoodleNotificationIdSchema.parse(702),
    ]);
  });

  test("rejects external and token-bearing context URLs", () => {
    // Given
    const origin = "https://moodle.synthetic.invalid";

    // When
    const external = safeNotificationHref(
      "https://attacker.example/collect?token=secret",
      origin,
    );
    const tokenBearing = safeNotificationHref(
      `${origin}/webservice/pluginfile.php?token=secret`,
      origin,
    );

    // Then
    expect(external).toBeNull();
    expect(tokenBearing).toBeNull();
  });
});
