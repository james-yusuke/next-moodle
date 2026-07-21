import { createHash, createHmac } from "node:crypto";
import sanitizeHtml from "sanitize-html";

import type { AiTextFormat } from "./contracts";

const BLOCK_TAG_PATTERN = /<\/?(?:address|article|aside|blockquote|br|div|h[1-6]|header|hr|li|main|ol|p|pre|section|table|tr|ul)[^>]*>/gi;
const SENTENCE_END_PATTERN = /[。！？.!?]/;

type CursorContextInput = Readonly<{
  beforeCursor: string;
  afterCursor: string;
  format: AiTextFormat;
}>;

export type AiCursorContext = Readonly<{
  beforeCursor: string;
  afterCursor: string;
  format: AiTextFormat;
}>;

type OpaqueIdentityInput = Readonly<{
  siteUrl: string;
  userId: number;
}>;

type SafetyIdentifierInput = OpaqueIdentityInput & Readonly<{
  safetySecret: string;
}>;

export type AiReviewResult = Readonly<{
  summary: string;
  gaps: readonly string[];
  paragraphs: readonly string[];
}>;

export function plainTextFromHtml(value: string): string {
  const separated = value.replace(BLOCK_TAG_PATTERN, "\n");
  return sanitizeHtml(separated, {
    allowedAttributes: {},
    allowedTags: [],
  })
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export function buildCompletionContext(input: CursorContextInput): AiCursorContext {
  return {
    beforeCursor: input.beforeCursor.slice(-2_000),
    afterCursor: input.afterCursor.slice(0, 500),
    format: input.format,
  };
}

function identityMaterial(input: OpaqueIdentityInput): string {
  return `${new URL(input.siteUrl).origin}|${input.userId}`;
}

export function createSafetyIdentifier(input: SafetyIdentifierInput): string {
  const digest = createHmac("sha256", input.safetySecret)
    .update(`openai-safety|${identityMaterial(input)}`)
    .digest("base64url");
  return `nm_${digest}`;
}

export function createAiConsentStorageKey(input: OpaqueIdentityInput): string {
  const digest = createHash("sha256")
    .update(`ai-consent|${identityMaterial(input)}`)
    .digest("base64url");
  return `next-moodle:ai-consent:${digest}`;
}

export function limitCompletionText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim().slice(0, 240);
  let sentenceCount = 0;
  for (let index = 0; index < compact.length; index += 1) {
    const character = compact[index];
    if (character !== undefined && SENTENCE_END_PATTERN.test(character)) {
      sentenceCount += 1;
      if (sentenceCount === 2) {
        return compact.slice(0, index + 1).trim();
      }
    }
  }
  return compact;
}

export function limitReviewResult(input: AiReviewResult): AiReviewResult {
  const paragraphs: string[] = [];
  let used = 0;
  for (const paragraph of input.paragraphs.slice(0, 3)) {
    const separatorLength = paragraphs.length === 0 ? 0 : 2;
    const remaining = 1_200 - used - separatorLength;
    if (remaining <= 0) break;
    const next = paragraph.trim().slice(0, remaining);
    if (next === "") continue;
    paragraphs.push(next);
    used += separatorLength + next.length;
  }
  return {
    summary: input.summary.trim().slice(0, 400),
    gaps: input.gaps
      .map((gap) => gap.replace(/\s+/g, " ").trim().slice(0, 240))
      .filter((gap) => gap !== "")
      .slice(0, 5),
    paragraphs,
  };
}
