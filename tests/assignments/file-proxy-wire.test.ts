import { describe, expect, test } from "bun:test";

import { MoodleSessionSchema } from "@/lib/moodle/site";
import {
  MoodleFileProxyError,
  proxyMoodleFile,
} from "@/lib/security/moodle-file-proxy";

function sessionFor(siteUrl: string) {
  return MoodleSessionSchema.parse({
    token: "synthetic-file-token",
    service: "fixture_service",
    userId: 101,
    expiresAt: Date.now() + 60_000,
    site: {
      siteName: "Wire Moodle",
      siteUrl,
      availableFunctions: [],
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
}

describe("protected Moodle file proxy wire", () => {
  test("streams a protected file with private headers and a sanitized filename", async () => {
    // Given
    let receivedToken = "";
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        receivedToken = new URL(request.url).searchParams.get("token") ?? "";
        return new Response("protected notes", {
          headers: {
            "content-disposition": 'attachment; filename="../notes;secret.txt"',
            "content-length": "15",
            "content-type": "text/plain",
          },
        });
      },
    });
    const siteUrl = server.url.toString().replace(/\/$/, "");
    const target = `${siteUrl}/webservice/pluginfile.php/12/mod_assign/intro/501/notes.txt`;

    try {
      // When
      const response = await proxyMoodleFile(sessionFor(siteUrl), target);

      // Then
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("protected notes");
      expect(receivedToken).toBe("synthetic-file-token");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-disposition")).not.toContain("../");
      expect(JSON.stringify([...response.headers])).not.toContain("synthetic-file-token");
    } finally {
      server.stop(true);
    }
  });

  test("rejects an upstream redirect without following its alternate origin", async () => {
    // Given
    let requests = 0;
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch() {
        requests += 1;
        return new Response(null, {
          status: 302,
          headers: { location: "https://evil.invalid/stolen" },
        });
      },
    });
    const siteUrl = server.url.toString().replace(/\/$/, "");
    const target = `${siteUrl}/webservice/pluginfile.php/12/mod_assign/intro/501/notes.txt`;

    try {
      // When
      const action = proxyMoodleFile(sessionFor(siteUrl), target);

      // Then
      await expect(action).rejects.toBeInstanceOf(MoodleFileProxyError);
      expect(requests).toBe(1);
    } finally {
      server.stop(true);
    }
  });
});
