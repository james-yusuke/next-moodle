import { describe, expect, test } from "bun:test";

import { AiConfigurationError, type AiRuntimeConfig } from "./config";
import {
  handleAiCompletionRequest,
  handleAiReviewRequest,
  type AiAssignmentAuthorization,
  type AiHttpDependencies,
} from "./http";
import type { AiWritingProvider } from "./provider";
import { AiRateLimiter } from "./rate-limit";

const enabledConfig: AiRuntimeConfig = {
  enabled: true,
  apiKey: "sk-test",
  completionModel: "gpt-5.6-luna",
  reviewModel: "gpt-5.6-terra",
  safetySecret: "safety-secret-with-at-least-thirty-two-bytes",
};

const authorization: AiAssignmentAuthorization = {
  descriptionHtml: "<p>提供された観察結果だけを比較する。</p>",
  onlineTextSupported: true,
  siteUrl: "https://moodle.example.edu",
  taskTitle: "観察レポート",
  userId: 42,
};

class FakeProvider implements AiWritingProvider {
  async *streamCompletion() {
    yield { kind: "delta", text: "条件をそろえて比較すると、" } as const;
    yield { kind: "done" } as const;
  }

  async review() {
    return {
      summary: "比較の軸は書かれています。",
      gaps: ["観察条件の説明が不足しています。"],
      paragraphs: ["観察条件を同じ順序で示すと、差の根拠が読み取りやすくなります。"],
    };
  }
}

function dependencies(overrides: Partial<AiHttpDependencies> = {}): AiHttpDependencies {
  return {
    config: enabledConfig,
    configurationError: null,
    limiter: new AiRateLimiter(),
    loadAssignment: async () => authorization,
    now: () => 10_000,
    provider: new FakeProvider(),
    ...overrides,
  };
}

function aiRequest(path: string, body: unknown, consent = true): Request {
  return new Request(`https://app.example${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example",
      "sec-fetch-site": "same-origin",
      ...(consent ? { "x-ai-consent": "1" } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("AI assignment HTTP boundary", () => {
  test("Given invalid server AI configuration, When review is requested, Then a typed safe error is returned", async () => {
    const response = await handleAiReviewRequest(
      aiRequest("/api/assignments/9101/ai/review", {
        excerpt: "設定が壊れていても入力内容を応答へ含めず、安全なエラーだけを返します。",
        format: 2,
        intent: "gaps",
      }),
      "9101",
      dependencies({ configurationError: new AiConfigurationError() }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "ai_configuration_error" },
    });
  });

  test("Given no browser consent, When completion is requested, Then no assignment or provider work runs", async () => {
    let loaded = false;
    const response = await handleAiCompletionRequest(
      aiRequest("/api/assignments/9101/ai/completion", {
        beforeCursor: "これは通信してはいけない未同意の文章入力です。",
        afterCursor: "",
        format: 2,
      }, false),
      "9101",
      dependencies({ loadAssignment: async () => {
        loaded = true;
        return authorization;
      } }),
    );

    expect(response.status).toBe(403);
    expect(loaded).toBe(false);
    expect(await response.text()).toContain("ai_consent_required");
  });

  test("Given an online-text assignment, When completion is requested, Then NDJSON contains bounded events", async () => {
    const response = await handleAiCompletionRequest(
      aiRequest("/api/assignments/9101/ai/completion", {
        beforeCursor: "観察結果Aでは変化が大きく、結果Bでは変化が小さかった。",
        afterCursor: "この差について",
        format: 2,
      }),
      "9101",
      dependencies(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect((await response.text()).trim().split("\n").map((line) => JSON.parse(line))).toEqual([
      { type: "delta", delta: "条件をそろえて比較すると、" },
      { type: "done" },
    ]);
  });

  test("Given a file-only assignment, When review is requested, Then it is rejected without provider output", async () => {
    const response = await handleAiReviewRequest(
      aiRequest("/api/assignments/9101/ai/review", {
        excerpt: "十分な長さを持つレビュー対象の文章です。内容を確認します。",
        format: 1,
        intent: "gaps",
      }),
      "9101",
      dependencies({
        loadAssignment: async () => ({ ...authorization, onlineTextSupported: false }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "ai_assignment_unsupported" },
    });
  });

  test("Given a valid review excerpt, When reviewed, Then only the public result is returned", async () => {
    const response = await handleAiReviewRequest(
      aiRequest("/api/assignments/9101/ai/review", {
        excerpt: "条件Aと条件Bの観察結果を比較した。条件Aの変化が大きかった。",
        format: 4,
        intent: "paragraphs",
      }),
      "9101",
      dependencies(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      result: {
        summary: "比較の軸は書かれています。",
        gaps: ["観察条件の説明が不足しています。"],
        paragraphs: ["観察条件を同じ順序で示すと、差の根拠が読み取りやすくなります。"],
      },
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
