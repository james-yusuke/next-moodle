import { describe, expect, test } from "bun:test";

import { restoreExistingFiles } from "@/lib/moodle/submission/existing-files";
import { SubmissionInputError } from "@/lib/moodle/submission/input";
import { MoodleSessionSchema } from "@/lib/moodle/site";

const policy = {
  kind: "enabled",
  limits: {
    acceptedFileTypes: [".pdf"],
    maxFileBytes: 1_000,
    maxFiles: 2,
    maxOnlineTextBytes: 1_000,
  },
  mode: "files",
  supportsFinalize: true,
} as const;

describe("existing assignment file preservation", () => {
  test("re-fetches only a current assignment opaque key with the server token", async () => {
    let receivedToken = "";
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        receivedToken = new URL(request.url).searchParams.get("token") ?? "";
        return new Response("%PDF-fixture", { headers: { "content-type": "application/pdf" } });
      },
    });
    const baseUrl = server.url.toString().replace(/\/$/, "");
    const session = MoodleSessionSchema.parse({
      token: "server-only-token",
      service: "fixture_service",
      userId: 101,
      expiresAt: Date.now() + 60_000,
      site: { siteName: "Example Learning Hub", siteUrl: baseUrl, availableFunctions: [] },
      capabilities: { assignments: true, calendar: false, courses: false, dashboard: false, fileUpload: true, notifications: false },
    });
    const key = "a".repeat(43);
    const target = `${baseUrl}/webservice/pluginfile.php/1/mod_assign/submission_files/2/report.pdf`;
    try {
      const restored = await restoreExistingFiles({
        files: [{ downloadUrl: `/api/files?url=${encodeURIComponent(target)}`, filename: "report.pdf", filesize: 12, key, mimetype: "application/pdf" }],
        keptKeys: [key],
        policy,
        session,
      });
      expect(restored[0]?.name).toBe("report.pdf");
      expect(receivedToken).toBe("server-only-token");
    } finally {
      server.stop(true);
    }
  });

  test("rejects a key that is not in the freshly loaded assignment", async () => {
    const session = MoodleSessionSchema.parse({
      token: "server-only-token",
      service: "fixture_service",
      userId: 101,
      expiresAt: Date.now() + 60_000,
      site: { siteName: "Example Learning Hub", siteUrl: "https://moodle.example", availableFunctions: [] },
      capabilities: { assignments: true, calendar: false, courses: false, dashboard: false, fileUpload: true, notifications: false },
    });
    await expect(restoreExistingFiles({ files: [], keptKeys: ["b".repeat(43)], policy, session }))
      .rejects.toBeInstanceOf(SubmissionInputError);
  });

  test("rejects a restored file when its response is larger than the Moodle metadata", async () => {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch() {
        return new Response(new Uint8Array(policy.limits.maxFileBytes + 1), {
          headers: { "content-type": "application/pdf" },
        });
      },
    });
    const baseUrl = server.url.toString().replace(/\/$/, "");
    const session = MoodleSessionSchema.parse({
      token: "server-only-token",
      service: "fixture_service",
      userId: 101,
      expiresAt: Date.now() + 60_000,
      site: { siteName: "Example Learning Hub", siteUrl: baseUrl, availableFunctions: [] },
      capabilities: { assignments: true, calendar: false, courses: false, dashboard: false, fileUpload: true, notifications: false },
    });
    const key = "c".repeat(43);
    const target = `${baseUrl}/webservice/pluginfile.php/1/mod_assign/submission_files/2/report.pdf`;
    try {
      const restore = restoreExistingFiles({
        files: [{ downloadUrl: `/api/files?url=${encodeURIComponent(target)}`, filename: "report.pdf", filesize: 12, key, mimetype: "application/pdf" }],
        keptKeys: [key],
        policy,
        session,
      });
      await expect(restore).rejects.toMatchObject({ code: "file_too_large" });
    } finally {
      server.stop(true);
    }
  });
});
