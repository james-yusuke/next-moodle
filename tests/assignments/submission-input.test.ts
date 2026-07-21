import { describe, expect, test } from "bun:test";

import type { NativeSubmissionPolicy } from "@/lib/moodle/queries/assignment-policy";
import {
  SubmissionInputError,
  assertSubmissionRequestEnvelope,
  parseSubmissionFormData,
} from "@/lib/moodle/submission/input";

const BASE_LIMITS = {
  acceptedFileTypes: [".pdf", "text/plain"],
  maxFileBytes: 10,
  maxFiles: 2,
  maxOnlineTextBytes: 100,
} as const;

function policy(
  mode: "online_text" | "files" | "mixed",
): Extract<NativeSubmissionPolicy, { readonly kind: "enabled" }> {
  return { groupId: 0, kind: "enabled", isGroupSubmission: false, limits: BASE_LIMITS, mode, requiresStatement: false, supportsFinalize: true };
}

describe("submission multipart parsing", () => {
  test.each([
    ["online_text", true, false],
    ["files", false, true],
    ["mixed", true, true],
  ] as const)("accepts a supported %s payload", async (mode, withText, withFile) => {
    // Given
    const form = new FormData();
    if (withText) {
      form.set("onlineText", "Tide pool observation");
    }
    if (withFile) {
      form.append("newFiles", new File(["notes"], "notes.txt", { type: "text/plain" }));
    }
    form.set("intent", "finalize");
    form.set("onlineText", withText ? "Tide pool observation" : "");
    form.set("onlineTextFormat", "2");

    // When
    const parsed = await parseSubmissionFormData(form, policy(mode));

    // Then
    expect(parsed.onlineText === "Tide pool observation").toBe(withText);
    expect(parsed.newFiles.length === 1).toBe(withFile);
    expect(parsed.intent).toBe("finalize");
  });

  test.each([
    [
      "file_count_exceeded",
      [
        new File(["one"], "one.txt", { type: "text/plain" }),
        new File(["two"], "two.txt", { type: "text/plain" }),
        new File(["three"], "three.txt", { type: "text/plain" }),
      ],
    ],
    [
      "file_too_large",
      [new File(["more than ten bytes"], "large.txt", { type: "text/plain" })],
    ],
    [
      "unsupported_file_type",
      [new File(["binary"], "payload.exe", { type: "application/x-msdownload" })],
    ],
    [
      "moodle_file_type_rejected",
      [new File(["GIF89a"], "photo.gif", { type: "image/gif" })],
    ],
  ] as const)("rejects %s before contacting Moodle", async (code, files) => {
    // Given
    const form = new FormData();
    for (const file of files) {
      form.append("newFiles", file);
    }
    form.set("intent", "save");
    form.set("onlineText", "");
    form.set("onlineTextFormat", "2");

    // When
    const action = () => parseSubmissionFormData(form, policy("files"));

    // Then
    await expect(action()).rejects.toBeInstanceOf(SubmissionInputError);
    try {
      await action();
    } catch (error) {
      if (error instanceof SubmissionInputError) {
        expect(error.code).toBe(code);
      } else {
        throw error;
      }
    }
  });

  test("rejects an oversized multipart envelope before body parsing", () => {
    // Given
    const request = new Request("https://app.example/api/assignments/9101/submission", {
      method: "POST",
      headers: {
        "content-length": "20000000",
        "content-type": "multipart/form-data; boundary=fixture",
      },
    });

    // When
    const action = () => assertSubmissionRequestEnvelope(request);

    // Then
    expect(action).toThrow(SubmissionInputError);
  });

  test("requires explicit agreement before finalizing an assignment with a statement", async () => {
    const form = new FormData();
    form.set("acceptSubmissionStatement", "false");
    form.set("intent", "finalize");
    form.set("onlineText", "Original work");
    form.set("onlineTextFormat", "2");
    const statementPolicy = { ...policy("online_text"), requiresStatement: true };
    await expect(parseSubmissionFormData(form, statementPolicy)).rejects.toBeInstanceOf(SubmissionInputError);
    form.set("acceptSubmissionStatement", "true");
    expect((await parseSubmissionFormData(form, statementPolicy)).acceptSubmissionStatement).toBe(true);
  });
});
