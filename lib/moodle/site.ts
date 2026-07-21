import { z } from "zod";

import type { MoodleConfig } from "./config";
import { MoodleServiceSchema } from "./config";
import { MoodleResponseError } from "./errors";
import {
  deriveCapabilities,
  MoodleCapabilitiesSchema,
  MoodleFunctionNameSchema,
  MoodleKnownFunctionNameSchema,
  type MoodleCapabilities,
  type MoodleKnownFunctionName,
} from "./functions";
import { MoodleTokenSchema, MoodleUserIdSchema } from "./identifiers";

const SiteFunctionWireSchema = z.object({
  name: MoodleFunctionNameSchema,
});

export const MoodleSiteInfoWireSchema = z.object({
  userid: MoodleUserIdSchema,
  sitename: z.string().min(1).max(512),
  siteurl: z.url(),
  functions: z.array(SiteFunctionWireSchema).max(20_000),
  uploadfiles: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .optional()
    .default(false)
    .transform((value) => value === true || value === 1),
});
export type MoodleSiteInfoWire = z.infer<typeof MoodleSiteInfoWireSchema>;

export const MoodleSiteSchema = z.object({
  siteName: z.string().min(1).max(512),
  siteUrl: z.url(),
  availableFunctions: z.array(MoodleKnownFunctionNameSchema),
});
export type MoodleSite = Readonly<z.infer<typeof MoodleSiteSchema>>;

export const MoodleSessionSchema = z.object({
  token: MoodleTokenSchema,
  service: MoodleServiceSchema,
  userId: MoodleUserIdSchema,
  expiresAt: z.number().int().nonnegative(),
  site: MoodleSiteSchema,
  capabilities: MoodleCapabilitiesSchema,
});
export type MoodleSession = Readonly<z.infer<typeof MoodleSessionSchema>>;

export type SafeSiteInfo = {
  readonly userId: MoodleSiteInfoWire["userid"];
  readonly site: MoodleSite;
  readonly capabilities: MoodleCapabilities;
};

function canonicalSiteUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function toSafeSiteInfo(
  wire: MoodleSiteInfoWire,
  config: MoodleConfig,
): SafeSiteInfo {
  const returnedUrl = canonicalSiteUrl(wire.siteurl);
  if (returnedUrl !== canonicalSiteUrl(config.baseUrl)) {
    throw new MoodleResponseError();
  }

  const availableFunctions: MoodleKnownFunctionName[] = [];
  for (const entry of wire.functions) {
    const parsed = MoodleKnownFunctionNameSchema.safeParse(entry.name);
    if (parsed.success && !availableFunctions.includes(parsed.data)) {
      availableFunctions.push(parsed.data);
    }
  }

  return {
    userId: wire.userid,
    site: {
      siteName: wire.sitename,
      siteUrl: returnedUrl,
      availableFunctions,
    },
    capabilities: deriveCapabilities(availableFunctions, wire.uploadfiles),
  };
}
