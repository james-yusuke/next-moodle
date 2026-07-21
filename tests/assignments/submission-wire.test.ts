import { describe, expect, test } from "bun:test";

import { MoodleClient } from "@/lib/moodle/client";
import type { NativeSubmissionMode, NativeSubmissionPolicy } from "@/lib/moodle/queries/assignment-policy";
import { MoodleAssignmentIdSchema } from "@/lib/moodle/identifiers";
import { MoodleSessionSchema } from "@/lib/moodle/site";
import { parseSubmissionFormData } from "@/lib/moodle/submission/input";
import { executeAssignmentSubmission } from "@/lib/moodle/submission/moodle";

type WireEvent = Readonly<{
  fields: Readonly<Record<string, string>>;
  kind: "upload" | "save" | "submit";
}>;

const LIMITS = {
  acceptedFileTypes: ["text/plain"],
  maxFileBytes: 1_000,
  maxFiles: 2,
  maxOnlineTextBytes: 1_000,
} as const;

function enabledPolicy(
  mode: NativeSubmissionMode,
): Extract<NativeSubmissionPolicy, { readonly kind: "enabled" }> {
  return { kind: "enabled", limits: LIMITS, mode, supportsFinalize: true };
}

async function runWireFlow(
  mode: NativeSubmissionMode,
  finalize: boolean,
): Promise<readonly WireEvent[]> {
  const events: WireEvent[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/webservice/upload.php") {
        const form = await request.formData();
        const uploadedFile = form.get("file");
        events.push({
          kind: "upload",
          fields: {
            itemid: String(form.get("itemid")),
            filename: uploadedFile instanceof File ? uploadedFile.name : "",
          },
        });
        return Response.json([
          {
            itemid: 7000,
            filename: "notes.txt",
            filepath: "/",
            filesize: 5,
            mimetype: "text/plain",
          },
        ]);
      }
      const form = new URLSearchParams(await request.text());
      const functionName = form.get("wsfunction");
      const fields = Object.fromEntries(form.entries());
      if (functionName === "mod_assign_save_submission") {
        events.push({ kind: "save", fields });
        return Response.json({ status: true, warnings: [] });
      }
      if (functionName === "mod_assign_submit_for_grading") {
        events.push({ kind: "submit", fields });
        return Response.json({ status: true, warnings: [] });
      }
      return Response.json({ error: "unexpected request" }, { status: 500 });
    },
  });
  const baseUrl = server.url.toString().replace(/\/$/, "");
  try {
    const session = MoodleSessionSchema.parse({
      token: "synthetic-token",
      service: "fixture_service",
      userId: 101,
      expiresAt: Date.now() + 60_000,
      site: {
        siteName: "Wire Moodle",
        siteUrl: baseUrl,
        availableFunctions: [
          "mod_assign_get_assignments",
          "mod_assign_get_submission_status",
          "mod_assign_save_submission",
          "mod_assign_submit_for_grading",
        ],
      },
      capabilities: {
        dashboard: false,
        courses: false,
        assignments: true,
        calendar: false,
        notifications: false,
        fileUpload: true,
      },
    });
    const client = new MoodleClient({
      config: { baseUrl, service: "moodle_mobile_app", timeoutMs: 2_000 },
      token: session.token,
      availableFunctions: session.site.availableFunctions,
    });
    const form = new FormData();
    if (mode !== "files") {
      form.set("onlineText", "Tide pool observation");
    }
    if (mode !== "online_text") {
      form.append("newFiles", new File(["notes"], "notes.txt", { type: "text/plain" }));
    }
    form.set("intent", finalize ? "finalize" : "save");
    form.set("onlineText", mode === "files" ? "" : "Tide pool observation");
    form.set("onlineTextFormat", "2");
    const payload = await parseSubmissionFormData(form, enabledPolicy(mode));
    await executeAssignmentSubmission({
      assignmentId: MoodleAssignmentIdSchema.parse(501),
      client,
      payload,
      session,
      submissionDrafts: true,
    });
    return events;
  } finally {
    server.stop(true);
  }
}

describe("Moodle assignment mutation wire", () => {
  test("saves an online-text submission without an upload", async () => {
    // Given / When
    const events = await runWireFlow("online_text", false);

    // Then
    expect(events.map((event) => event.kind)).toEqual(["save"]);
    expect(events[0]?.fields["plugindata[onlinetext_editor][text]"]).toBe(
      "Tide pool observation",
    );
  });

  test("uploads a file draft before saving its item id", async () => {
    // Given / When
    const events = await runWireFlow("files", false);

    // Then
    expect(events.map((event) => event.kind)).toEqual(["upload", "save"]);
    expect(events[1]?.fields["plugindata[files_filemanager]"]).toBe("7000");
  });

  test("orders mixed upload, save, and optional final submission", async () => {
    // Given / When
    const events = await runWireFlow("mixed", true);

    // Then
    expect(events.map((event) => event.kind)).toEqual([
      "upload",
      "save",
      "submit",
    ]);
    expect(events[1]?.fields["plugindata[onlinetext_editor][text]"]).toBe(
      "Tide pool observation",
    );
    expect(events[2]?.fields.acceptsubmissionstatement).toBe("0");
  });

  test("does not retry a failed save mutation", async () => {
    // Given
    let requests = 0;
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch() {
        requests += 1;
        return Response.json({ error: "outage" }, { status: 503 });
      },
    });
    const baseUrl = server.url.toString().replace(/\/$/, "");
    const session = MoodleSessionSchema.parse({
      token: "synthetic-token",
      service: "fixture_service",
      userId: 101,
      expiresAt: Date.now() + 60_000,
      site: {
        siteName: "Wire Moodle",
        siteUrl: baseUrl,
        availableFunctions: ["mod_assign_save_submission"],
      },
      capabilities: {
        dashboard: false,
        courses: false,
        assignments: true,
        calendar: false,
        notifications: false,
        fileUpload: true,
      },
    });
    const client = new MoodleClient({
      config: { baseUrl, service: "moodle_mobile_app", timeoutMs: 2_000 },
      token: session.token,
      availableFunctions: session.site.availableFunctions,
    });
    const form = new FormData();
    form.set("onlineText", "No retry");
    form.set("onlineTextFormat", "2");
    form.set("intent", "save");
    const payload = await parseSubmissionFormData(form, enabledPolicy("online_text"));

    // When
    const action = executeAssignmentSubmission({
      assignmentId: MoodleAssignmentIdSchema.parse(501),
      client,
      payload,
      session,
      submissionDrafts: true,
    });

    // Then
    try {
      await expect(action).rejects.toThrow();
      expect(requests).toBe(1);
    } finally {
      server.stop(true);
    }
  });
});
