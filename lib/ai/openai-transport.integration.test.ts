import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

import { AiProviderRateLimitError } from "./errors";
import type {
  OpenAiCompletionTransportRequest,
  OpenAiReviewTransportRequest,
} from "./provider";

mock.module("server-only", () => ({}));

let server: ReturnType<typeof Bun.serve>;
const requestBodies: unknown[] = [];

const baseRequest = {
  input: "匿名化された確認対象",
  instructions: "与えられた範囲だけを補助する。",
  safetyIdentifier: "nm_opaque-test-id",
  signal: AbortSignal.timeout(2_000),
  store: false,
} as const;

beforeAll(() => {
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const body: unknown = await request.json();
      requestBodies.push(body);
      const model = typeof body === "object" && body !== null && "model" in body
        ? body.model
        : undefined;
      if (model === "rate-limit-model") {
        return Response.json({ error: { message: "rate limited", type: "requests" } }, { status: 429 });
      }
      const stream = typeof body === "object" && body !== null && "stream" in body && body.stream === true;
      if (stream) {
        return new Response([
          'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"補足候補"}\n\n',
          'event: response.completed\ndata: {"type":"response.completed"}\n\n',
          "data: [DONE]\n\n",
        ].join(""), { headers: { "content-type": "text/event-stream" } });
      }
      const result = JSON.stringify({ summary: "要点", gaps: [], paragraphs: [] });
      return Response.json({
        id: "resp_mock",
        object: "response",
        created_at: 1,
        status: "completed",
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: {},
        model: "review-model",
        output: [{
          id: "msg_mock",
          type: "message",
          status: "completed",
          role: "assistant",
          content: [{ type: "output_text", text: result, annotations: [], logprobs: [] }],
        }],
        parallel_tool_calls: false,
        tool_choice: "auto",
        tools: [],
        background: false,
        max_output_tokens: 900,
        previous_response_id: null,
        reasoning: { effort: "low", summary: null },
        safety_identifier: "nm_opaque-test-id",
        service_tier: "default",
        store: false,
        text: { format: { type: "text" }, verbosity: "low" },
        truncation: "disabled",
        usage: null,
      });
    },
  });
});

afterAll(() => server.stop(true));

describe("official OpenAI SDK transport against a local mock", () => {
  test("streams completion events without tools, storage, or conversation state", async () => {
    const { OpenAiSdkTransport } = await import("./openai-transport");
    const transport = new OpenAiSdkTransport({
      apiKey: "sk-test-only",
      baseUrl: `${server.url.origin}/v1`,
    });
    const stream = await transport.createCompletion({
      ...baseRequest,
      maxOutputTokens: 180,
      model: "completion-model",
      reasoningEffort: "none",
    } satisfies OpenAiCompletionTransportRequest);
    const events: unknown[] = [];
    for await (const event of stream) events.push(event);

    expect(events).toEqual([
      { type: "response.output_text.delta", delta: "補足候補" },
      { type: "response.completed" },
    ]);
    expect(requestBodies.at(-1)).toMatchObject({
      model: "completion-model",
      reasoning: { effort: "none" },
      safety_identifier: "nm_opaque-test-id",
      store: false,
      stream: true,
    });
    expect(requestBodies.at(-1)).not.toHaveProperty("tools");
    expect(requestBodies.at(-1)).not.toHaveProperty("previous_response_id");
  });

  test("returns structured review text and maps a real 429 response", async () => {
    const { OpenAiSdkTransport } = await import("./openai-transport");
    const transport = new OpenAiSdkTransport({
      apiKey: "sk-test-only",
      baseUrl: `${server.url.origin}/v1`,
    });
    const request = {
      ...baseRequest,
      maxOutputTokens: 900,
      model: "review-model",
      reasoningEffort: "low",
      responseSchema: {
        type: "json_schema",
        name: "review",
        strict: true,
        schema: { type: "object" },
      },
    } as unknown as OpenAiReviewTransportRequest;

    expect(await transport.createReview(request)).toContain('"summary":"要点"');
    await expect(transport.createReview({ ...request, model: "rate-limit-model" }))
      .rejects.toBeInstanceOf(AiProviderRateLimitError);
  });
});
