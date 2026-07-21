import { z } from "zod";

const MoodleFileUrlSchema = z.url().max(4_096);
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["127.0.0.1", "localhost"]);
const ENCODED_PATH_CONTROL = /%(?:25)*(?:00|2e|2f|5c)/i;
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const HEADER_UNSAFE = /[\u0000-\u001f\u007f"';:]+/g;

export class MoodleFileTargetError extends Error {
  override readonly name = "MoodleFileTargetError";
  readonly code = "invalid_file_target";

  constructor() {
    super("The Moodle file target is invalid.");
  }
}

function canonicalBaseUrl(value: string): URL {
  const parsed = MoodleFileUrlSchema.safeParse(value);
  if (!parsed.success) {
    throw new MoodleFileTargetError();
  }
  const url = new URL(parsed.data);
  const localHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (
    (url.protocol !== "https:" && !localHttp) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new MoodleFileTargetError();
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}

function pluginFilePrefix(base: URL): string {
  const basePath = base.pathname === "" ? "" : base.pathname;
  return `${basePath}/webservice/pluginfile.php/`.replace(/^\/\//, "/");
}

function hasUnsafePath(pathname: string): boolean {
  if (ENCODED_PATH_CONTROL.test(pathname)) {
    return true;
  }
  let decoded = pathname;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    } catch (error) {
      if (error instanceof URIError) {
        return true;
      }
      throw error;
    }
  }
  return decoded
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "." || segment === "..");
}

export function parseMoodleFileTarget(value: string, siteUrl: string): URL {
  const parsed = MoodleFileUrlSchema.safeParse(value);
  const base = canonicalBaseUrl(siteUrl);
  if (!parsed.success) {
    throw new MoodleFileTargetError();
  }
  const target = new URL(parsed.data);
  const prefix = pluginFilePrefix(base);
  if (
    target.origin !== base.origin ||
    target.username !== "" ||
    target.password !== "" ||
    target.hash !== "" ||
    !target.pathname.startsWith(prefix) ||
    target.pathname.length <= prefix.length ||
    hasUnsafePath(parsed.data)
  ) {
    throw new MoodleFileTargetError();
  }
  for (const key of target.searchParams.keys()) {
    if (key.toLowerCase() === "token") {
      throw new MoodleFileTargetError();
    }
  }
  return target;
}

export function moodleFileProxyPath(
  value: string,
  siteUrl: string,
): string | null {
  try {
    const target = parseMoodleFileTarget(value, siteUrl);
    return `/api/files?url=${encodeURIComponent(target.toString())}`;
  } catch (error) {
    if (error instanceof MoodleFileTargetError) {
      return null;
    }
    throw error;
  }
}

export function sanitizeDownloadFilename(value: string): string {
  const segments = value.normalize("NFKC").replace(BIDI_CONTROL, "").split(/[\\/]/);
  const basename = segments.at(-1) ?? "";
  const sanitized = basename
    .replace(HEADER_UNSAFE, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 180);
  return sanitized === "" || sanitized === "." || sanitized === ".."
    ? "download"
    : sanitized;
}

function filenameFromDisposition(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const encoded = /filename\*\s*=\s*UTF-8''([^;]*)/i.exec(value)?.[1];
  if (encoded !== undefined) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch (error) {
      if (!(error instanceof URIError)) {
        throw error;
      }
    }
  }
  return /filename\s*=\s*"([^"]*)"/i.exec(value)?.[1] ??
    /filename\s*=\s*([^;]*)/i.exec(value)?.[1]?.trim() ??
    null;
}

function asciiFilename(value: string): string {
  const safe = value.replace(/[^\x20-\x7e]/g, "_").replace(/[\\"]/g, "_");
  return safe === "" ? "download" : safe;
}

export function safeContentDisposition(
  upstream: string | null,
  fallback: string,
): string {
  const filename = sanitizeDownloadFilename(
    filenameFromDisposition(upstream) ?? fallback,
  );
  const kind = upstream?.trimStart().toLowerCase().startsWith("inline")
    ? "inline"
    : "attachment";
  return `${kind}; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
