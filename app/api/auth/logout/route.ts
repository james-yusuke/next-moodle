import { destroyMoodleSession } from "@/lib/auth/server";
import {
  authErrorResponse,
  noStoreResponse,
} from "@/lib/auth/http";
import { assertSameOriginMutation } from "@/lib/auth/same-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    await destroyMoodleSession();
    return noStoreResponse({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      return authErrorResponse(error);
    }
    throw error;
  }
}
