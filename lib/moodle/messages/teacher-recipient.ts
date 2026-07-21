import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";

const RecipientPayloadSchema = z.object({
  c: z.number().int().positive(),
  e: z.number().int().positive(),
  r: z.number().int().positive(),
  s: z.string().length(64),
  u: z.number().int().positive(),
  v: z.literal(1),
});

type SealInput = Readonly<{
  courseId: number;
  expiresAt: number;
  nonce?: Uint8Array;
  recipientId: number;
  secret: string;
  siteUrl: string;
  viewerId: number;
}>;

type OpenInput = Readonly<{
  courseId: number;
  key: string;
  nowSeconds: number;
  secret: string;
  siteUrl: string;
  viewerId: number;
}>;

function encryptionKey(secret: string): Buffer {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("Teacher recipient secret is too short.");
  }
  return createHash("sha256").update(secret).digest();
}

function siteFingerprint(siteUrl: string): string {
  return createHash("sha256").update(new URL(siteUrl).origin).digest("hex");
}

export function sealTeacherRecipientKey(input: SealInput): string {
  const iv = input.nonce === undefined ? randomBytes(12) : Buffer.from(input.nonce);
  if (iv.byteLength !== 12) throw new Error("Invalid recipient key nonce.");
  const payload = RecipientPayloadSchema.parse({
    c: input.courseId,
    e: input.expiresAt,
    r: input.recipientId,
    s: siteFingerprint(input.siteUrl),
    u: input.viewerId,
    v: 1,
  });
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(input.secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return `tr1.${Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString("base64url")}`;
}

export function openTeacherRecipientKey(
  input: OpenInput,
): Readonly<{ recipientId: number }> | null {
  try {
    if (!input.key.startsWith("tr1.")) return null;
    const bytes = Buffer.from(input.key.slice(4), "base64url");
    if (bytes.byteLength < 29) return null;
    const iv = bytes.subarray(0, 12);
    const authenticationTag = bytes.subarray(-16);
    const encrypted = bytes.subarray(12, -16);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(input.secret), iv);
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const payload = RecipientPayloadSchema.parse(JSON.parse(plaintext));
    if (
      payload.c !== input.courseId ||
      payload.u !== input.viewerId ||
      payload.s !== siteFingerprint(input.siteUrl) ||
      payload.e < input.nowSeconds
    ) return null;
    return { recipientId: payload.r };
  } catch {
    return null;
  }
}
