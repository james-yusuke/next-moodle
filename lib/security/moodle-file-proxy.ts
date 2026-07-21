import ky from "ky";

import type { MoodleSession } from "@/lib/moodle/site";

import {
  parseMoodleFileTarget,
  safeContentDisposition,
} from "./moodle-file";

export class MoodleFileProxyError extends Error {
  override readonly name = "MoodleFileProxyError";

  constructor(readonly code: "file_not_available" | "invalid_file_target") {
    super("The Moodle file could not be delivered safely.");
  }
}

function fallbackFilename(url: URL): string {
  return url.pathname.split("/").at(-1) ?? "download";
}

function responseHeaders(upstream: Response, target: URL): Headers {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": safeContentDisposition(
      upstream.headers.get("content-disposition"),
      fallbackFilename(target),
    ),
    "X-Content-Type-Options": "nosniff",
  });
  const contentType = upstream.headers.get("content-type");
  if (contentType !== null) {
    headers.set("Content-Type", contentType);
  }
  const contentLength = upstream.headers.get("content-length");
  if (contentLength !== null && /^\d+$/.test(contentLength)) {
    headers.set("Content-Length", contentLength);
  }
  return headers;
}

export async function proxyMoodleFile(
  session: MoodleSession,
  targetInput: string,
): Promise<Response> {
  let target: URL;
  try {
    target = parseMoodleFileTarget(targetInput, session.site.siteUrl);
  } catch (error) {
    if (error instanceof Error) {
      throw new MoodleFileProxyError("invalid_file_target");
    }
    throw error;
  }

  let upstream: Response;
  try {
    upstream = await ky.get(target, {
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      retry: { limit: 0 },
      searchParams: { token: session.token },
      throwHttpErrors: false,
      timeout: 10_000,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new MoodleFileProxyError("file_not_available");
    }
    throw error;
  }

  if (!upstream.ok || upstream.status >= 300) {
    throw new MoodleFileProxyError("file_not_available");
  }
  return new Response(upstream.body, {
    headers: responseHeaders(upstream, target),
    status: upstream.status,
  });
}
