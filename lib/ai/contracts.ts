import { z } from "zod";

export const AiTextFormatSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(4),
]);
export type AiTextFormat = z.infer<typeof AiTextFormatSchema>;

export const AiCompletionInputSchema = z.object({
  beforeCursor: z.string().max(20_000),
  afterCursor: z.string().max(5_000),
  format: AiTextFormatSchema,
}).strict().refine(
  (value) => `${value.beforeCursor}${value.afterCursor}`.trim().length >= 24,
  { message: "Completion context is too short" },
);
export type AiCompletionInput = Readonly<z.infer<typeof AiCompletionInputSchema>>;

export const AiReviewInputSchema = z.object({
  excerpt: z.string().trim().min(24).max(6_000),
  format: AiTextFormatSchema,
  intent: z.enum(["gaps", "paragraphs"]),
}).strict();
export type AiReviewInput = Readonly<z.infer<typeof AiReviewInputSchema>>;

export const AiCompletionStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), delta: z.string().max(240) }),
  z.object({ type: z.literal("done") }),
  z.object({
    type: z.literal("error"),
    error: z.object({ code: z.string().min(1).max(80) }),
  }),
]);
export type AiCompletionStreamEvent = Readonly<
  z.infer<typeof AiCompletionStreamEventSchema>
>;

export const AiReviewResultSchema = z.object({
  summary: z.string(),
  gaps: z.array(z.string()),
  paragraphs: z.array(z.string()),
}).strict();

export const AiReviewResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: AiReviewResultSchema }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string().min(1).max(80) }),
  }),
]);
