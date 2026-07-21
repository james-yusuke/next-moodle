import { describe, expect, test } from "bun:test";

import { safeNotificationHref } from "@/lib/moodle/queries/notifications-schema";

describe("notification links", () => {
  test("maps Moodle student destinations into next-moodle routes", () => {
    const site = "https://moodle.example.invalid";
    expect(safeNotificationHref(`${site}/mod/assign/view.php?id=81`, site)).toBe("/assignments/81");
    expect(safeNotificationHref(`${site}/mod/forum/view.php?id=82`, site)).toBe("/activities/82");
    expect(safeNotificationHref(`${site}/course/view.php?id=83`, site)).toBe("/courses/83");
  });

  test("does not expose an unmapped Moodle UI route", () => {
    const site = "https://moodle.example.invalid";
    expect(safeNotificationHref(`${site}/user/profile.php?id=99`, site)).toBeNull();
  });
});
