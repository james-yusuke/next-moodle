import { z } from "zod";

const RuntimeConfigSchema = z.object({
  appName: z.string().trim().min(1).max(80).default("next-moodle"),
  locale: z.string().trim().min(2).max(35).default("ja-JP"),
  timeZone: z.string().trim().min(1).max(80).default("Asia/Tokyo"),
}).superRefine((value, context) => {
  try {
    Intl.getCanonicalLocales(value.locale);
  } catch {
    context.addIssue({ code: "custom", path: ["locale"], message: "Invalid locale" });
  }
  try {
    new Intl.DateTimeFormat(value.locale, { timeZone: value.timeZone }).format();
  } catch {
    context.addIssue({ code: "custom", path: ["timeZone"], message: "Invalid time zone" });
  }
});

export type AppRuntimeConfig = Readonly<z.infer<typeof RuntimeConfigSchema>>;

export class AppConfigurationError extends Error {
  readonly code = "configuration_error";

  constructor() {
    super("Application runtime configuration is invalid.");
    this.name = "AppConfigurationError";
  }
}

export function createAppRuntimeConfig(input: {
  readonly appName?: string;
  readonly locale?: string;
  readonly timeZone?: string;
}): AppRuntimeConfig {
  const parsed = RuntimeConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppConfigurationError();
  }
  return parsed.data;
}

export function readAppRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AppRuntimeConfig {
  return createAppRuntimeConfig({
    ...(environment.APP_NAME === undefined ? {} : { appName: environment.APP_NAME }),
    ...(environment.APP_LOCALE === undefined ? {} : { locale: environment.APP_LOCALE }),
    ...(environment.APP_TIME_ZONE === undefined
      ? {}
      : { timeZone: environment.APP_TIME_ZONE }),
  });
}
