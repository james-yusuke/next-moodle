import { describe, expect, test } from "bun:test";

import {
  completionIsEligible,
  completionStatusCopy,
  consumeCompletionNdjson,
  insertAtSelection,
} from "./ai-client";

describe("AI writing client behavior", () => {
  test("Given typed completion failures, When shown, Then recovery copy stays specific", () => {
    expect(completionStatusCopy("ai_rate_limited")).toContain("1分");
    expect(completionStatusCopy("ai_refused")).toContain("候補は作成できません");
    expect(completionStatusCopy("ai_timeout")).toContain("時間内");
    expect(completionStatusCopy("ai_unavailable")).toContain("入力は保持");
  });

  test("Given IME composition, selection, short text, or submission, When checked, Then completion does not run", () => {
    const base = {
      beforeCursor: "これは補完を要求できる十分な長さの日本語レポート本文です。",
      consented: true,
      enabled: true,
      hasSelection: false,
      isComposing: false,
      submitting: false,
    } as const;

    expect(completionIsEligible({ ...base, isComposing: true })).toBe(false);
    expect(completionIsEligible({ ...base, hasSelection: true })).toBe(false);
    expect(completionIsEligible({ ...base, submitting: true })).toBe(false);
    expect(completionIsEligible({ ...base, beforeCursor: "短い文章" })).toBe(false);
    expect(completionIsEligible(base)).toBe(true);
  });

  test("Given chunked NDJSON, When consumed, Then split lines are parsed without losing deltas", async () => {
    const encoder = new TextEncoder();
    const response = new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"type":"delta","del'));
        controller.enqueue(encoder.encode('ta":"続き"}\n{"type":"done"}\n'));
        controller.close();
      },
    }), { headers: { "content-type": "application/x-ndjson" } });

    const events = await consumeCompletionNdjson(response);

    expect(events).toEqual([
      { type: "delta", delta: "続き" },
      { type: "done" },
    ]);
  });

  test("Given a cursor selection, When a suggestion is inserted, Then the replaced range and undo value are explicit", () => {
    const result = insertAtSelection({
      end: 8,
      start: 5,
      suggestion: "補足",
      value: "0123456789",
    });

    expect(result).toEqual({
      nextValue: "01234補足89",
      nextCursor: 7,
      previousValue: "0123456789",
    });
  });
});
