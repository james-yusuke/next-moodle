import { z } from "zod";

const DEFAULT_COMPLETION_MODEL = "gpt-5.6-luna";
const DEFAULT_REVIEW_MODEL = "gpt-5.6-terra";

const HttpsUrlSchema = z.url().refine((value) => new URL(value).protocol === "https:");
const SafetySecretSchema = z.string().superRefine((value, context) => {
  if (new TextEncoder().encode(value).byteLength < 32) {
    context.addIssue({ code: "custom", message: "AI safety secret is too short" });
  }
});

const DisabledAiConfigSchema = z.object({
  enabled: z.literal(false),
  completionModel: z.string().trim().min(1).max(200),
  reviewModel: z.string().trim().min(1).max(200),
  privacyNoticeUrl: HttpsUrlSchema.optional(),
});

const EnabledAiConfigSchema = z.object({
  enabled: z.literal(true),
  apiKey: z.string().trim().min(1).max(1_024),
  completionModel: z.string().trim().min(1).max(200),
  reviewModel: z.string().trim().min(1).max(200),
  safetySecret: SafetySecretSchema,
  privacyNoticeUrl: HttpsUrlSchema.optional(),
});

const AiRuntimeConfigSchema = z.discriminatedUnion("enabled", [
  DisabledAiConfigSchema,
  EnabledAiConfigSchema,
]);

export type AiRuntimeConfig = Readonly<z.infer<typeof AiRuntimeConfigSchema>>;
export type AiAvailability = Readonly<{
  enabled: boolean;
  provider: "OpenAI";
  privacyNoticeUrl?: string;
}>;

type AiConfigInput = Readonly<{
  enabled?: string;
  apiKey?: string;
  completionModel?: string;
  reviewModel?: string;
  safetySecret?: string;
  privacyNoticeUrl?: string;
}>;

export class AiConfigurationError extends Error {
  override readonly name = "AiConfigurationError";
  readonly code = "ai_configuration_error";

  constructor() {
    super("AI assistance configuration is invalid.");
  }
}

export function createAiRuntimeConfig(input: AiConfigInput): AiRuntimeConfig {
  if (input.enabled !== undefined && input.enabled !== "true" && input.enabled !== "false") {
    throw new AiConfigurationError();
  }
  const enabled = input.enabled === "true";
  const raw = enabled
    ? {
        enabled,
        apiKey: input.apiKey,
        completionModel: input.completionModel ?? DEFAULT_COMPLETION_MODEL,
        reviewModel: input.reviewModel ?? DEFAULT_REVIEW_MODEL,
        safetySecret: input.safetySecret,
        ...(input.privacyNoticeUrl === undefined
          ? {}
          : { privacyNoticeUrl: input.privacyNoticeUrl }),
      }
    : {
        enabled,
        completionModel: input.completionModel ?? DEFAULT_COMPLETION_MODEL,
        reviewModel: input.reviewModel ?? DEFAULT_REVIEW_MODEL,
        ...(input.privacyNoticeUrl === undefined
          ? {}
          : { privacyNoticeUrl: input.privacyNoticeUrl }),
      };
  const parsed = AiRuntimeConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiConfigurationError();
  }
  return parsed.data;
}

export function readAiRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AiRuntimeConfig {
  return createAiRuntimeConfig({
    ...(environment.AI_ASSIST_ENABLED === undefined
      ? {}
      : { enabled: environment.AI_ASSIST_ENABLED }),
    ...(environment.OPENAI_API_KEY === undefined
      ? {}
      : { apiKey: environment.OPENAI_API_KEY }),
    ...(environment.OPENAI_COMPLETION_MODEL === undefined
      ? {}
      : { completionModel: environment.OPENAI_COMPLETION_MODEL }),
    ...(environment.OPENAI_REVIEW_MODEL === undefined
      ? {}
      : { reviewModel: environment.OPENAI_REVIEW_MODEL }),
    ...(environment.AI_SAFETY_SECRET === undefined
      ? {}
      : { safetySecret: environment.AI_SAFETY_SECRET }),
    ...(environment.AI_PRIVACY_NOTICE_URL === undefined
      ? {}
      : { privacyNoticeUrl: environment.AI_PRIVACY_NOTICE_URL }),
  });
}

export function toAiAvailability(config: AiRuntimeConfig): AiAvailability {
  return {
    enabled: config.enabled,
    provider: "OpenAI",
    ...(config.privacyNoticeUrl === undefined
      ? {}
      : { privacyNoticeUrl: config.privacyNoticeUrl }),
  };
}
