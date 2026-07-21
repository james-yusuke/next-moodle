import { describe, expect, test } from "bun:test";

import {
  MoodleFileTargetError,
  parseMoodleFileTarget,
  safeContentDisposition,
  sanitizeDownloadFilename,
} from "@/lib/security/moodle-file";

const SITE_URL = "https://moodle.example.edu/moodle";

describe("protected Moodle file validation", () => {
  test("accepts only the configured HTTPS origin and pluginfile path", () => {
    // Given
    const target =
      `${SITE_URL}/webservice/pluginfile.php/12/mod_assign/intro/42/notes.pdf?forcedownload=1`;

    // When
    const parsed = parseMoodleFileTarget(target, SITE_URL);

    // Then
    expect(parsed.toString()).toBe(target);
  });

  test.each([
    "http://moodle.example.edu/moodle/webservice/pluginfile.php/12/mod_assign/intro/42/a.pdf",
    "https://evil.invalid/moodle/webservice/pluginfile.php/12/mod_assign/intro/42/a.pdf",
    "https://moodle.example.edu:444/moodle/webservice/pluginfile.php/12/mod_assign/intro/42/a.pdf",
    "https://moodle.example.edu/moodle/pluginfile.php/12/mod_assign/intro/42/a.pdf",
    "https://moodle.example.edu/moodle/webservice/pluginfile.php/%2e%2e/a.pdf",
    "https://moodle.example.edu/moodle/webservice/pluginfile.php/%252e%252e/a.pdf",
    "https://moodle.example.edu/moodle/webservice/pluginfile.php/12/a.pdf?token=browser-secret",
  ])("rejects an unsafe target: %s", (target) => {
    // Given / When
    const action = () => parseMoodleFileTarget(target, SITE_URL);

    // Then
    expect(action).toThrow(MoodleFileTargetError);
  });

  test("sanitizes a hostile upstream filename before writing headers", () => {
    // Given
    const hostile = "../../report\r\nX-Leak: token.pdf";

    // When
    const filename = sanitizeDownloadFilename(hostile);
    const disposition = safeContentDisposition(
      `attachment; filename="${hostile}"`,
      "fallback.pdf",
    );

    // Then
    expect(filename).toBe("report_X-Leak_ token.pdf");
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain("\n");
    expect(disposition).toContain("filename*=UTF-8''report_X-Leak_%20token.pdf");
  });
});
