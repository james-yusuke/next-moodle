export type LaunchActivityData = Readonly<{
  attemptCount: number | null;
  id: number;
  kind: "bigbluebuttonbn" | "h5pactivity" | "lti" | "scorm" | "url";
  name: string;
  sourceUrl: string | null;
  statusLabel: string;
}>;

/**
 * Converts a Moodle assignment URL that has already passed `safeMoodleUrl`
 * into the corresponding in-app destination. Keeping this conversion local
 * means a URL activity that points to an assignment uses the submission
 * workspace rather than the launch endpoint, which only supports runtime and
 * external-tool activities.
 */
export function assignmentDestinationFromTrustedMoodleUrl(
  sourceUrl: string | null,
): string | null {
  if (sourceUrl === null) return null;
  try {
    const url = new URL(sourceUrl);
    if (!url.pathname.endsWith("/mod/assign/view.php")) return null;
    const ids = url.searchParams.getAll("id");
    const id = ids[0];
    if (ids.length !== 1 || id === undefined || !/^[1-9]\d{0,9}$/.test(id)) {
      return null;
    }
    return `/assignments/${id}`;
  } catch {
    return null;
  }
}

export function isSafeLaunchEndpoint(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
