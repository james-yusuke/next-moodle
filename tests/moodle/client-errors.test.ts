import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { MoodleClient } from "../../lib/moodle/client";
import {
  MoodleInputError,
  MoodlePermissionError,
} from "../../lib/moodle/errors";
import {
  createMoodleConfig,
  MOODLE_FUNCTIONS,
  MoodleTokenSchema,
} from "../../lib/moodle/model";
import { jsonResponse, startWireMoodle } from "./wire-fake";

const EmptySchema = z.object({});

function clientFor(baseUrl: string): MoodleClient {
  return new MoodleClient({
    config: createMoodleConfig({ baseUrl, timeoutMs: 500 }),
    token: MoodleTokenSchema.parse("fixture-token"),
  });
}

describe("Moodle exception categories", () => {
  test("maps a permission exception without exposing upstream text", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({
        exception: "required_capability_exception",
        errorcode: "nopermissions",
        message: "private permission detail",
        debuginfo: "private debug detail",
      }),
    );

    try {
      // When
      const outcome = clientFor(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        EmptySchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodlePermissionError);
      await expect(outcome).rejects.toMatchObject({
        message: "Moodle denied this operation.",
      });
    } finally {
      moodle.close();
    }
  });

  test("maps an invalid-parameter exception to a typed input error", async () => {
    // Given
    const moodle = startWireMoodle(() =>
      jsonResponse({
        exception: "invalid_parameter_exception",
        errorcode: "invalidparameter",
        message: "untrusted parameter detail",
      }),
    );

    try {
      // When
      const outcome = clientFor(moodle.baseUrl).call(
        MOODLE_FUNCTIONS.siteInfo,
        {},
        EmptySchema,
      );

      // Then
      await expect(outcome).rejects.toBeInstanceOf(MoodleInputError);
      await expect(outcome).rejects.toMatchObject({
        message: "The Moodle request is invalid.",
      });
    } finally {
      moodle.close();
    }
  });
});
