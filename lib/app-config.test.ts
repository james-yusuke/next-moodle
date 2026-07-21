import { describe, expect, test } from "bun:test";

import {
  AppConfigurationError,
  createAppRuntimeConfig,
  readAppRuntimeConfig,
} from "./app-config";

describe("application runtime configuration", () => {
  test("uses safe generic defaults", () => {
    expect(readAppRuntimeConfig({})).toEqual({
      appName: "next-moodle",
      locale: "ja-JP",
      timeZone: "Asia/Tokyo",
    });
  });

  test("accepts a deployment-specific locale and time zone", () => {
    expect(createAppRuntimeConfig({
      appName: "Learning Desk",
      locale: "en-GB",
      timeZone: "Europe/London",
    })).toMatchObject({ appName: "Learning Desk", timeZone: "Europe/London" });
  });

  test("rejects invalid display settings", () => {
    expect(() => createAppRuntimeConfig({ timeZone: "Mars/Olympus" }))
      .toThrow(AppConfigurationError);
  });
});
