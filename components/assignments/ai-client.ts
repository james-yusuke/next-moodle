import {
  AiCompletionStreamEventSchema,
  type AiCompletionStreamEvent,
} from "@/lib/ai/contracts";

export function completionStatusCopy(code: string | null): string {
  switch (code) {
    case "ai_rate_limited":
    case "ai_provider_rate_limited":
      return "候補の利用上限です。1分ほど待ってから続けてください。";
    case "ai_request_in_progress":
      return "前の候補を処理中です。入力はそのまま続けられます。";
    case "ai_refused":
      return "この入力への候補は作成できませんでした。";
    case "ai_timeout":
      return "候補が時間内に届きませんでした。入力は保持されています。";
    case null:
      return "";
    default:
      return "文章補助へ接続できません。入力は保持されています。";
  }
}

type CompletionEligibility = Readonly<{
  beforeCursor: string;
  consented: boolean;
  enabled: boolean;
  hasSelection: boolean;
  isComposing: boolean;
  submitting: boolean;
}>;

type SelectionInsertInput = Readonly<{
  end: number;
  start: number;
  suggestion: string;
  value: string;
}>;

type SelectionInsertResult = Readonly<{
  nextValue: string;
  nextCursor: number;
  previousValue: string;
}>;

export class AiClientResponseError extends Error {
  override readonly name = "AiClientResponseError";

  constructor() {
    super("AI assistance response is invalid.");
  }
}

export function completionIsEligible(input: CompletionEligibility): boolean {
  return input.enabled &&
    input.consented &&
    !input.hasSelection &&
    !input.isComposing &&
    !input.submitting &&
    input.beforeCursor.trim().length >= 24;
}

function parseLine(line: string): AiCompletionStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch (error) {
    if (error instanceof SyntaxError) throw new AiClientResponseError();
    throw error;
  }
  const parsed = AiCompletionStreamEventSchema.safeParse(value);
  if (!parsed.success) throw new AiClientResponseError();
  return parsed.data;
}

export async function* streamCompletionNdjson(
  response: Response,
): AsyncIterable<AiCompletionStreamEvent> {
  if (response.body === null) throw new AiClientResponseError();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const next = await reader.read();
      pending += decoder.decode(next.value, { stream: !next.done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim() !== "") yield parseLine(line);
      }
      if (next.done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (pending.trim() !== "") yield parseLine(pending);
}

export async function consumeCompletionNdjson(
  response: Response,
): Promise<readonly AiCompletionStreamEvent[]> {
  const events: AiCompletionStreamEvent[] = [];
  for await (const event of streamCompletionNdjson(response)) events.push(event);
  return events;
}

export function insertAtSelection(input: SelectionInsertInput): SelectionInsertResult {
  const nextValue = `${input.value.slice(0, input.start)}${input.suggestion}${input.value.slice(input.end)}`;
  return {
    nextValue,
    nextCursor: input.start + input.suggestion.length,
    previousValue: input.value,
  };
}
