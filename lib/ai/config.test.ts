import { describe, expect, test } from "bun:test";

import {
  AiConfigurationError,
  createAiRuntimeConfig,
  readAiRuntimeConfig,
  toAiAvailability,
} from "./config";

describe("AI runtime configuration", () => {
  test("Given no AI environment, When parsed, Then assistance stays disabled without secrets", () => {
    const config = readAiRuntimeConfig({});

    expect(config).toEqual({
      enabled: false,
      completionModel: "gpt-5.6-luna",
      reviewModel: "gpt-5.6-terra",
    });
    expect(toAiAvailability(config)).toEqual({
      enabled: false,
      provider: "OpenAI",
    });
  });

  test("Given an enabled deployment, When parsed, Then secret values stay outside availability", () => {
    const config = createAiRuntimeConfig({
      enabled: "true",
      apiKey: "sk-test-value-that-never-leaves-the-server",
      completionModel: "gpt-5.6-luna",
      reviewModel: "gpt-5.6-terra",
      safetySecret: "safety-secret-with-at-least-thirty-two-bytes",
      privacyNoticeUrl: "https://example.edu/privacy/ai",
    });

    expect(config.enabled).toBe(true);
    expect(toAiAvailability(config)).toEqual({
      enabled: true,
      provider: "OpenAI",
      privacyNoticeUrl: "https://example.edu/privacy/ai",
    });
    expect(JSON.stringify(toAiAvailability(config))).not.toContain("sk-test");
    expect(JSON.stringify(toAiAvailability(config))).not.toContain("safety-secret");
  });

  test("Given enabled AI without a safe secret, When parsed, Then configuration is rejected", () => {
    expect(() => createAiRuntimeConfig({
      enabled: "true",
      apiKey: "sk-test",
      safetySecret: "too-short",
    })).toThrow(AiConfigurationError);
  });

  test("Given an unknown enable flag, When parsed, Then configuration is rejected", () => {
    expect(() => createAiRuntimeConfig({ enabled: "sometimes" })).toThrow(
      AiConfigurationError,
    );
  });
});
