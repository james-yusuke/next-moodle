import { z } from "zod";

import {
  MoodleCredentialsSchema,
  type MoodleCredentials,
} from "../moodle/identifiers";

export class AuthRequestError extends Error {
  override readonly name = "AuthRequestError";
  readonly code = "invalid_request";

  constructor() {
    super("Authentication request is invalid.");
  }
}

const ContentLengthSchema = z.coerce.number().int().nonnegative().max(16_384);

export async function readLoginCredentials(
  request: Request,
): Promise<MoodleCredentials> {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = request.headers.get("content-length") ?? "0";
  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    !ContentLengthSchema.safeParse(contentLength).success
  ) {
    throw new AuthRequestError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 16_384) {
    throw new AuthRequestError();
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AuthRequestError();
    }
    throw error;
  }
  const parsed = MoodleCredentialsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AuthRequestError();
  }
  return parsed.data;
}
