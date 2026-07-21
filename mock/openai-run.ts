export {};

const portInput = process.env.OPENAI_MOCK_PORT ?? "28766";
const port = Number(portInput);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("OPENAI_MOCK_PORT must be a valid port.");
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    if (request.method !== "POST" || url.pathname !== "/v1/responses") {
      return Response.json({ error: { message: "not found" } }, { status: 404 });
    }
    const body: unknown = await request.json();
    const streaming = typeof body === "object" && body !== null &&
      "stream" in body && body.stream === true;
    if (streaming) {
      return new Response([
        'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"比較の観点を先に示すと、結果の違いが明確になります。"}\n\n',
        'event: response.completed\ndata: {"type":"response.completed"}\n\n',
        "data: [DONE]\n\n",
      ].join(""), { headers: { "content-type": "text/event-stream" } });
    }
    const result = JSON.stringify({
      summary: "比較の軸を確認しました。",
      gaps: ["観察条件の説明を確認してください。"],
      paragraphs: ["比較する観点を先に示すと、観察結果の違いが読み取りやすくなります。<strong>補足</strong>"],
    });
    return Response.json({
      id: "resp_e2e",
      object: "response",
      created_at: 1,
      status: "completed",
      error: null,
      incomplete_details: null,
      instructions: null,
      metadata: {},
      model: "mock-review-model",
      output: [{
        id: "msg_e2e",
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
      safety_identifier: "nm_mock",
      service_tier: "default",
      store: false,
      text: { format: { type: "text" }, verbosity: "low" },
      truncation: "disabled",
      usage: null,
    });
  },
});

const stop = (): void => {
  server.stop(true);
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
