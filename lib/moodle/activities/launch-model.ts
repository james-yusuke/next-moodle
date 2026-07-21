export type LaunchActivityData = Readonly<{
  attemptCount: number | null;
  id: number;
  kind: "bigbluebuttonbn" | "h5pactivity" | "lti" | "scorm" | "url";
  name: string;
  sourceUrl: string | null;
  statusLabel: string;
}>;

export function isSafeLaunchEndpoint(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
