import { handleAiCompletionRequest } from "@/lib/ai/http";
import { createAiHttpDependencies } from "@/lib/ai/runtime";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  const { cmid } = await context.params;
  return handleAiCompletionRequest(request, cmid, createAiHttpDependencies());
}
