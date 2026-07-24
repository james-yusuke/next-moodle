function hasSensitiveQueryKey(key: string): boolean {
  return /(token|secret|password|credential|private|api[-_]?key)/i.test(key);
}

function relativeMoodlePath(candidate: URL, site: URL): string | null {
  const sitePath = site.pathname.endsWith("/") ? site.pathname : `${site.pathname}/`;
  if (!candidate.pathname.startsWith(sitePath)) {
    return null;
  }
  return `/${candidate.pathname.slice(sitePath.length)}`.replace(/\/{2,}/g, "/");
}

/**
 * Converts a trusted Moodle student URL into its in-app destination.  This is
 * deliberately limited to course and activity view pages: it is not a general
 * purpose external redirector.
 */
export function safeMoodleDestination(
  value: string | undefined,
  siteUrl: string,
): string | null {
  if (value === undefined) return null;
  try {
    const site = new URL(siteUrl);
    const candidate = new URL(value);
    if (
      candidate.origin !== site.origin ||
      (candidate.protocol !== "http:" && candidate.protocol !== "https:") ||
      candidate.username !== "" ||
      candidate.password !== "" ||
      [...candidate.searchParams.keys()].some(hasSensitiveQueryKey)
    ) {
      return null;
    }

    const id = Number(candidate.searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id <= 0) return null;

    const pathname = relativeMoodlePath(candidate, site);
    if (pathname === "/course/view.php") return `/courses/${id}`;
    const moduleName = /^\/mod\/([a-z0-9_]+)\/view\.php$/.exec(pathname ?? "")?.[1];
    if (moduleName === undefined) return null;
    return moduleName === "assign" ? `/assignments/${id}` : `/activities/${id}`;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}
