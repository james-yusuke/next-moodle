import { z } from "zod";

import type { AiTextFormat } from "./contracts";
import { AiReviewResultSchema } from "./contracts";
import {
  AiProviderRefusalError,
  AiProviderResponseError,
} from "./errors";
import { limitReviewResult, type AiReviewResult } from "./context";

export { AiProviderRefusalError } from "./errors";

const CompletionDeltaSchema = z.object({
  type: z.literal("response.output_text.delta"),
  delta: z.string(),
});
const EventEnvelopeSchema = z.object({ type: z.string() });

const REVIEW_SCHEMA = {
  type: "json_schema",
  name: "next_moodle_review",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      gaps: { type: "array", items: { type: "string" } },
      paragraphs: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "gaps", "paragraphs"],
  },
} as const;

type ProviderBaseInput = Readonly<{
  taskTitle: string;
  taskDescription: string;
  safetyIdentifier: string;
  signal: AbortSignal;
}>;

export type AiCompletionProviderInput = ProviderBaseInput & Readonly<{
  beforeCursor: string;
  afterCursor: string;
  format: AiTextFormat;
}>;

export type AiReviewProviderInput = ProviderBaseInput & Readonly<{
  excerpt: string;
  format: AiTextFormat;
  intent: "gaps" | "paragraphs";
}>;

export type AiProviderCompletionEvent =
  | Readonly<{ kind: "delta"; text: string }>
  | Readonly<{ kind: "done" }>;

type OpenAiTransportBaseRequest = Readonly<{
  input: string;
  instructions: string;
  model: string;
  reasoningEffort: "none" | "low";
  safetyIdentifier: string;
  signal: AbortSignal;
  store: false;
}>;

export type OpenAiCompletionTransportRequest = OpenAiTransportBaseRequest & Readonly<{
  maxOutputTokens: 180;
}>;

export type OpenAiReviewTransportRequest = OpenAiTransportBaseRequest & Readonly<{
  maxOutputTokens: 900;
  responseSchema: typeof REVIEW_SCHEMA;
}>;

export interface OpenAiTransport {
  createCompletion(
    request: OpenAiCompletionTransportRequest,
  ): Promise<AsyncIterable<unknown>>;
  createReview(request: OpenAiReviewTransportRequest): Promise<string>;
}

export interface AiWritingProvider {
  streamCompletion(
    input: AiCompletionProviderInput,
  ): AsyncIterable<AiProviderCompletionEvent>;
  review(input: AiReviewProviderInput): Promise<AiReviewResult>;
}

type ProviderOptions = Readonly<{
  completionModel: string;
  reviewModel: string;
  transport: OpenAiTransport;
}>;

function formatName(format: AiTextFormat): string {
  return format === 1 ? "HTML" : format === 4 ? "Markdown" : "プレーンテキスト";
}

export class OpenAiWritingProvider implements AiWritingProvider {
  readonly #options: ProviderOptions;

  constructor(options: ProviderOptions) {
    this.#options = options;
  }

  async *streamCompletion(
    input: AiCompletionProviderInput,
  ): AsyncIterable<AiProviderCompletionEvent> {
    const stream = await this.#options.transport.createCompletion({
      input: `課題名:\n${input.taskTitle}\n\n課題文:\n${input.taskDescription}\n\n形式: ${formatName(input.format)}\n\nカーソル前:\n${input.beforeCursor}\n\nカーソル後:\n${input.afterCursor}`,
      instructions: "学習者が書いている日本語レポートの続きを最大2文で補助する。与えられた文脈にない事実、数値、引用、参考文献を追加しない。全文を代筆せず、候補本文だけを返す。",
      maxOutputTokens: 180,
      model: this.#options.completionModel,
      reasoningEffort: "none",
      safetyIdentifier: input.safetyIdentifier,
      signal: input.signal,
      store: false,
    });
    for await (const raw of stream) {
      const envelope = EventEnvelopeSchema.safeParse(raw);
      if (!envelope.success) throw new AiProviderResponseError();
      switch (envelope.data.type) {
        case "response.output_text.delta": {
          const delta = CompletionDeltaSchema.safeParse(raw);
          if (!delta.success) throw new AiProviderResponseError();
          yield { kind: "delta", text: delta.data.delta };
          break;
        }
        case "response.completed":
          yield { kind: "done" };
          return;
        case "response.refusal.delta":
        case "response.refusal.done":
          throw new AiProviderRefusalError();
        case "error":
        case "response.failed":
        case "response.incomplete":
          throw new AiProviderResponseError();
        default:
          break;
      }
    }
    throw new AiProviderResponseError();
  }

  async review(input: AiReviewProviderInput): Promise<AiReviewResult> {
    const output = await this.#options.transport.createReview({
      input: `課題名:\n${input.taskTitle}\n\n課題文:\n${input.taskDescription}\n\n形式: ${formatName(input.format)}\n\n確認対象:\n${input.excerpt}`,
      instructions: input.intent === "gaps"
        ? "学習者の文章に不足する説明を確認する。与えられた文脈にない事実、数値、引用、参考文献を作らない。summaryとgapsを簡潔に返し、paragraphsは空配列にする。"
        : "学習者の文章を補う最大3段落の案を作る。与えられた文脈にない事実、数値、引用、参考文献を作らず、全文を代筆しない。",
      maxOutputTokens: 900,
      model: this.#options.reviewModel,
      reasoningEffort: "low",
      responseSchema: REVIEW_SCHEMA,
      safetyIdentifier: input.safetyIdentifier,
      signal: input.signal,
      store: false,
    });
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(output);
    } catch (error) {
      if (error instanceof SyntaxError) throw new AiProviderResponseError();
      throw error;
    }
    const parsed = AiReviewResultSchema.safeParse(parsedJson);
    if (!parsed.success) throw new AiProviderResponseError();
    return limitReviewResult(parsed.data);
  }
}
