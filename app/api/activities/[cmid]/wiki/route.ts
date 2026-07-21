import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readWikiActivity } from "@/lib/moodle/activities/wiki";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema, type MoodleCourseModuleId } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const PageIdSchema = z.coerce.number().int().positive();
const EditInputSchema = z.object({
  action: z.literal("edit"),
  content: z.string().min(1).max(100_000),
  pageId: z.number().int().positive(),
  version: z.number().int().nonnegative(),
});
const EditingResponseSchema = z.object({
  pagesection: z.object({
    content: z.string().max(1_000_000).optional().default(""),
    contentformat: z.string().max(80).optional().default("html"),
    version: z.number().int().nonnegative(),
  }),
});
const EditResponseSchema = z.object({ pageid: z.number().int().positive() });

async function editablePage(cmid: MoodleCourseModuleId, pageId: number) {
  const session = await requireMoodleSession();
  if (session.manifest.features.wiki !== "available") return null;
  const activity = await readActivityWorkspace({ cmid, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
  if (activity.kind !== "ready" || activity.data?.moduleType !== "wiki" || activity.data.instance === null) return null;
  const wiki = await readWikiActivity({ cmid, courseId: activity.data.course.id, instance: activity.data.instance, siteUrl: session.site.siteUrl });
  if (wiki.kind !== "ready" || wiki.data === null || !wiki.data.pages.some((page) => page.id === pageId && page.canEdit)) return null;
  return createAuthenticatedMoodleClient();
}

export async function GET(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
  const pageId = PageIdSchema.safeParse(new URL(request.url).searchParams.get("pageId"));
  if (!cmid.success || !pageId.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
  const client = await editablePage(cmid.data, pageId.data);
  if (client === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
  const editing = await client.call(MOODLE_FUNCTIONS.wikiPageForEditing, { pageid: pageId.data, lockonly: false }, EditingResponseSchema);
  return Response.json({ ok: true, result: { content: editing.data.pagesection.content, format: editing.data.pagesection.contentformat, pageId: pageId.data, version: editing.data.pagesection.version } });
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 120_000) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = EditInputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const client = await editablePage(cmid.data, input.data.pageId);
    if (client === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const editing = await client.call(MOODLE_FUNCTIONS.wikiPageForEditing, { pageid: input.data.pageId, lockonly: true }, EditingResponseSchema);
    if (editing.data.pagesection.version !== input.data.version) return Response.json({ ok: false, error: { code: "edit_conflict" } }, { status: 409 });
    await client.call(MOODLE_FUNCTIONS.saveWikiPage, { pageid: input.data.pageId, content: input.data.content }, EditResponseSchema);
    return Response.json({ ok: true, result: { pageId: input.data.pageId } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "wiki_update_failed" } }, { status: 502 });
    throw error;
  }
}
