import { z } from "zod";

import { MoodleClient } from "./client";
import { tokenEndpoint, type MoodleConfig } from "./config";
import {
  MoodleAuthError,
  MoodleResponseError,
} from "./errors";
import { MOODLE_FUNCTIONS } from "./functions";
import {
  type MoodleCredentials,
  MoodleTokenSchema,
  type MoodleToken,
} from "./identifiers";
import {
  errorFromMoodleEnvelope,
  readMoodleJson,
} from "./response";
import {
  MoodleSiteInfoWireSchema,
  toSafeSiteInfo,
  type SafeSiteInfo,
} from "./site";
import { postMoodleForm } from "./transport";

const TokenFailureSchema = z.object({
  error: z.string(),
  errorcode: z.string(),
});

const TokenSuccessSchema = z.object({
  token: MoodleTokenSchema,
});

export type MoodleLogin = SafeSiteInfo & {
  readonly service: MoodleConfig["service"];
  readonly token: MoodleToken;
};

export async function requestMoodleToken(
  config: MoodleConfig,
  credentials: MoodleCredentials,
): Promise<MoodleToken> {
  const response = await postMoodleForm({
    url: tokenEndpoint(config),
    body: new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
      service: config.service,
    }),
    timeoutMs: config.timeoutMs,
    retryTransient: false,
  });
  const raw = await readMoodleJson(response);
  const moodleError = errorFromMoodleEnvelope(raw);
  if (moodleError !== null) {
    throw moodleError;
  }
  if (TokenFailureSchema.safeParse(raw).success) {
    throw new MoodleAuthError();
  }
  const parsed = TokenSuccessSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MoodleResponseError();
  }
  return parsed.data.token;
}

export async function authenticateWithMoodle(
  config: MoodleConfig,
  credentials: MoodleCredentials,
): Promise<MoodleLogin> {
  const token = await requestMoodleToken(config, credentials);
  const client = new MoodleClient({ config, token });
  const siteResponse = await client.call(
    MOODLE_FUNCTIONS.siteInfo,
    {},
    MoodleSiteInfoWireSchema,
  );
  return {
    service: config.service,
    token,
    ...toSafeSiteInfo(siteResponse.data, config),
  };
}
