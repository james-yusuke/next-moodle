import { describe, expect, test } from "bun:test";

import {
  buildCompletionContext,
  createAiConsentStorageKey,
  createSafetyIdentifier,
  limitCompletionText,
  limitReviewResult,
  plainTextFromHtml,
} from "./context";

describe("AI context boundaries", () => {
  test("Given Moodle HTML, When flattened, Then scripts and hidden markup are not sent", () => {
    const text = plainTextFromHtml(
      '<h2>課題</h2><script>steal()</script><p>観察結果を <strong>比較</strong> する。</p>',
    );

    expect(text).toBe("課題\n観察結果を 比較 する。");
    expect(text).not.toContain("steal");
  });

  test("Given a long draft around the cursor, When bounded, Then only the approved window remains", () => {
    const context = buildCompletionContext({
      beforeCursor: `discard-${"前".repeat(2_100)}`,
      afterCursor: `${"後".repeat(700)}-discard`,
      format: 2,
    });

    expect(context.beforeCursor).toHaveLength(2_000);
    expect(context.beforeCursor).toBe("前".repeat(2_000));
    expect(context.afterCursor).toBe("後".repeat(500));
    expect(context.format).toBe(2);
  });

  test("Given site and learner identifiers, When hashed, Then stable opaque values are separated by purpose", () => {
    const safety = createSafetyIdentifier({
      safetySecret: "safety-secret-with-at-least-thirty-two-bytes",
      siteUrl: "https://moodle.example.edu",
      userId: 42,
    });
    const consent = createAiConsentStorageKey({
      siteUrl: "https://moodle.example.edu",
      userId: 42,
    });

    expect(safety).toMatch(/^nm_[A-Za-z0-9_-]{43}$/);
    expect(consent).toMatch(/^next-moodle:ai-consent:[A-Za-z0-9_-]{43}$/);
    expect(consent).not.toContain("42");
    expect(consent).not.toContain("moodle.example.edu");
    expect(safety).not.toContain(consent.slice(-43));
  });

  test("Given an overlong completion, When limited, Then at most two sentences and 240 characters remain", () => {
    const source = `${"一".repeat(150)}。${"二".repeat(150)}。第三文。`;

    const limited = limitCompletionText(source);

    expect(limited.length).toBeLessThanOrEqual(240);
    expect(limited).not.toContain("第三文");
  });

  test("Given an overlong review, When limited, Then only three bounded paragraphs remain", () => {
    const result = limitReviewResult({
      summary: "要約".repeat(300),
      gaps: Array.from({ length: 8 }, (_, index) => `不足${index}`),
      paragraphs: Array.from({ length: 5 }, (_, index) => `${index}${"補".repeat(500)}`),
    });

    expect(result.summary.length).toBeLessThanOrEqual(400);
    expect(result.gaps).toHaveLength(5);
    expect(result.paragraphs).toHaveLength(3);
    expect(result.paragraphs.join("\n\n").length).toBeLessThanOrEqual(1_200);
  });
});
