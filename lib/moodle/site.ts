import { z } from "zod";

import type { MoodleConfig } from "./config";
import { MoodleServiceSchema } from "./config";
import {
  deriveCapabilityManifest,
  MoodleCapabilityManifestSchema,
  type MoodleCapabilityManifest,
} from "./capabilities";
import { MoodleResponseError } from "./errors";
import { MoodleFunctionNameSchema } from "./functions";
import { MoodleTokenSchema, MoodleUserIdSchema } from "./identifiers";

const SiteFunctionWireSchema = z.object({
  name: MoodleFunctionNameSchema,
});

export const MoodleSiteInfoWireSchema = z.object({
  userid: MoodleUserIdSchema,
  sitename: z.string().min(1).max(512),
  siteurl: z.url(),
  release: z.string().min(1).max(120).optional().default("unknown"),
  functions: z.array(SiteFunctionWireSchema).max(20_000),
  uploadfiles: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .optional()
    .default(false)
    .transform((value) => value === true || value === 1),
  downloadfiles: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .optional()
    .default(true)
    .transform((value) => value === true || value === 1),
});
export type MoodleSiteInfoWire = z.infer<typeof MoodleSiteInfoWireSchema>;

export const MoodleSiteSchema = z.object({
  siteName: z.string().min(1).max(512),
  siteUrl: z.url(),
});
export type MoodleSite = Readonly<z.infer<typeof MoodleSiteSchema>>;

export const MoodleSessionSchema = z.object({
  schemaVersion: z.literal(3),
  token: MoodleTokenSchema,
  service: MoodleServiceSchema,
  userId: MoodleUserIdSchema,
  expiresAt: z.number().int().nonnegative(),
  site: MoodleSiteSchema,
  manifest: MoodleCapabilityManifestSchema,
});
export type MoodleSession = Readonly<z.infer<typeof MoodleSessionSchema>>;

export type SafeSiteInfo = {
  readonly userId: MoodleSiteInfoWire["userid"];
  readonly site: MoodleSite;
  readonly manifest: MoodleCapabilityManifest;
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
  options: Readonly<{
    companion: Readonly<{
      adapters: readonly Readonly<{ moduleName: string; operations: readonly string[] }>[];
      contractVersion: number;
    }>;
    requireCompanion: boolean;
  }> = {
    companion: { adapters: [], contractVersion: 0 },
    requireCompanion: false,
  },
): SafeSiteInfo {
  const returnedUrl = canonicalSiteUrl(wire.siteurl);
  if (returnedUrl !== canonicalSiteUrl(config.baseUrl)) {
    throw new MoodleResponseError();
  }

  const functionNames = wire.functions.map((entry) => entry.name);

  return {
    userId: wire.userid,
    site: {
      siteName: wire.sitename,
      siteUrl: returnedUrl,
    },
    manifest: deriveCapabilityManifest({
      companion: options.companion,
      fileAccess: {
        download: wire.downloadfiles,
        upload: wire.uploadfiles,
      },
      functionNames,
      moodleRelease: wire.release,
      requireCompanion: options.requireCompanion,
    }),
  };
}
