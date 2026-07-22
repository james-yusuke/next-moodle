import { describe, expect, test } from "bun:test";

import {
  motionIntentToTransitionTypes,
  sharedTransitionName,
} from "@/components/app-shell/motion";

describe("motionIntentToTransitionTypes", () => {
  test("Given a drill-in intent, When mapping navigation motion, Then it returns the matching transition type", () => {
    const result = motionIntentToTransitionTypes("drill-in");

    expect(result).toEqual(["drill-in"]);
  });

  test("Given a reveal intent, When mapping navigation motion, Then it returns no route transition type", () => {
    const result = motionIntentToTransitionTypes("reveal");

    expect(result).toEqual([]);
  });
});

describe("sharedTransitionName", () => {
  test("Given a course identifier, When creating a shared name, Then the result is stable and CSS-safe", () => {
    const result = sharedTransitionName("course", "BIO 101/春");

    expect(result).toBe("course-BIO-101");
  });
});
