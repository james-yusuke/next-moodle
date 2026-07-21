import ky from "ky";

import { MoodleOutageError } from "./errors";

const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

type MoodlePost = {
  readonly url: URL;
  readonly body: URLSearchParams;
  readonly timeoutMs: number;
  readonly retryTransient: boolean;
};

export function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUSES.has(status);
}

export async function postMoodleForm(options: MoodlePost): Promise<Response> {
  const attempts = options.retryTransient ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await ky.post(options.url, {
        body: options.body,
        timeout: options.timeoutMs,
        retry: { limit: 0 },
        throwHttpErrors: false,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
      if (isTransientStatus(response.status) && attempt + 1 < attempts) {
        continue;
      }
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (attempt + 1 < attempts) {
          continue;
        }
        throw new MoodleOutageError();
      }
      throw error;
    }
  }

  throw new MoodleOutageError();
}
