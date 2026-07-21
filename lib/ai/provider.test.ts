import { describe, expect, test } from "bun:test";

import { AiProviderRefusalError, OpenAiWritingProvider } from "./provider";
import type {
  OpenAiCompletionTransportRequest,
  OpenAiReviewTransportRequest,
  OpenAiTransport,
} from "./provider";

class RecordingTransport implements OpenAiTransport {
  completionRequest: OpenAiCompletionTransportRequest | null = null;
  reviewRequest: OpenAiReviewTransportRequest | null = null;
  completionEvents: readonly unknown[] = [
    { type: "response.output_text.delta", delta: "補足候補です。" },
    { type: "response.completed" },
  ];
  reviewOutput = JSON.stringify({
    summary: "要点は明確です。",
    gaps: ["比較条件を明示してください。"],
    paragraphs: ["比較条件をそろえると、観察結果の差を説明しやすくなります。"],
  });

  async createCompletion(
    request: OpenAiCompletionTransportRequest,
  ): Promise<AsyncIterable<unknown>> {
    this.completionRequest = request;
    const events = this.completionEvents;
    return (async function* stream() {
      for (const event of events) yield event;
    })();
  }

  async createReview(request: OpenAiReviewTransportRequest): Promise<string> {
    this.reviewRequest = request;
    return this.reviewOutput;
  }
}

const baseInput = {
  taskTitle: "観察レポート",
  taskDescription: "二つの条件を比較し、提供された観察結果だけから説明する。",
  safetyIdentifier: "nm_opaque",
  signal: new AbortController().signal,
} as const;

describe("OpenAI writing provider", () => {
  test("Given completion context, When streamed, Then the request is stateless, tool-free, and low latency", async () => {
    const transport = new RecordingTransport();
    const provider = new OpenAiWritingProvider({
      completionModel: "gpt-5.6-luna",
      reviewModel: "gpt-5.6-terra",
      transport,
    });

    const events = [];
    for await (const event of provider.streamCompletion({
      ...baseInput,
      beforeCursor: "観察結果Aでは変化が大きく、結果Bでは",
      afterCursor: "という違いが見られた。",
      format: 2,
    })) events.push(event);

    expect(events).toEqual([
      { kind: "delta", text: "補足候補です。" },
      { kind: "done" },
    ]);
    expect(transport.completionRequest).toMatchObject({
      maxOutputTokens: 180,
      model: "gpt-5.6-luna",
      reasoningEffort: "none",
      safetyIdentifier: "nm_opaque",
      store: false,
    });
    expect(JSON.stringify(transport.completionRequest)).not.toContain("tools");
  });

  test("Given a review request, When completed, Then strict structured output is bounded and low reasoning", async () => {
    const transport = new RecordingTransport();
    const provider = new OpenAiWritingProvider({
      completionModel: "gpt-5.6-luna",
      reviewModel: "gpt-5.6-terra",
      transport,
    });

    const result = await provider.review({
      ...baseInput,
      excerpt: "条件Aと条件Bを観察した。",
      format: 4,
      intent: "gaps",
    });

    expect(result.gaps).toEqual(["比較条件を明示してください。"]);
    expect(transport.reviewRequest).toMatchObject({
      model: "gpt-5.6-terra",
      reasoningEffort: "low",
      store: false,
    });
    expect(transport.reviewRequest?.responseSchema).toMatchObject({
      name: "next_moodle_review",
      strict: true,
      type: "json_schema",
    });
  });

  test("Given a refusal event, When completion streams, Then refusal text is never offered as a suggestion", async () => {
    const transport = new RecordingTransport();
    transport.completionEvents = [
      { type: "response.refusal.delta", delta: "cannot help" },
    ];
    const provider = new OpenAiWritingProvider({
      completionModel: "gpt-5.6-luna",
      reviewModel: "gpt-5.6-terra",
      transport,
    });

    const consume = async () => {
      for await (const _event of provider.streamCompletion({
        ...baseInput,
        beforeCursor: "これは十分な長さを持つ入力中の文章です。続きを考えています。",
        afterCursor: "",
        format: 1,
      })) void _event;
    };

    await expect(consume()).rejects.toBeInstanceOf(AiProviderRefusalError);
  });
});
