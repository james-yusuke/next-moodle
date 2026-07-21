import { describe, expect, test } from "bun:test";

import {
  AiConcurrentRequestError,
  AiRateLimitError,
  AiRateLimiter,
} from "./rate-limit";

describe("AI per-user limiter", () => {
  test("Given an active request, When another starts, Then concurrency is rejected until release", () => {
    const limiter = new AiRateLimiter();
    const release = limiter.acquire({ kind: "completion", now: 1_000, userKey: "learner-a" });

    expect(() => limiter.acquire({
      kind: "review",
      now: 1_001,
      userKey: "learner-a",
    })).toThrow(AiConcurrentRequestError);
    release();
    expect(() => limiter.acquire({
      kind: "review",
      now: 1_002,
      userKey: "learner-a",
    })).not.toThrow();
  });

  test("Given twelve completion calls in a minute, When a thirteenth starts, Then it is rate limited", () => {
    const limiter = new AiRateLimiter();
    for (let index = 0; index < 12; index += 1) {
      limiter.acquire({
        kind: "completion",
        now: 10_000 + index,
        userKey: "learner-a",
      })();
    }

    expect(() => limiter.acquire({
      kind: "completion",
      now: 20_000,
      userKey: "learner-a",
    })).toThrow(AiRateLimitError);
    expect(() => limiter.acquire({
      kind: "completion",
      now: 70_001,
      userKey: "learner-a",
    })).not.toThrow();
  });

  test("Given three review calls, When a fourth starts, Then another learner remains isolated", () => {
    const limiter = new AiRateLimiter();
    for (let index = 0; index < 3; index += 1) {
      limiter.acquire({ kind: "review", now: index, userKey: "learner-a" })();
    }

    expect(() => limiter.acquire({
      kind: "review",
      now: 10,
      userKey: "learner-a",
    })).toThrow(AiRateLimitError);
    expect(() => limiter.acquire({
      kind: "review",
      now: 10,
      userKey: "learner-b",
    })).not.toThrow();
  });
});
