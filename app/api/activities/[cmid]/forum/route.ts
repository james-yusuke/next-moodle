import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { ForumDiscussionsResponseSchema, ForumPostsResponseSchema } from "@/lib/moodle/activities/forum";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const CommonSchema = z.object({ subject: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(20_000) });
const InputSchema = z.discriminatedUnion("action", [
  CommonSchema.extend({ action: z.literal("create") }),
  z.object({ action: z.literal("read"), discussionId: z.number().int().positive() }),
  z.object({ action: z.literal("subscribe"), discussionId: z.number().int().positive(), subscribed: z.boolean() }),
  CommonSchema.extend({
    action: z.literal("reply"),
    discussionId: z.number().int().positive(),
    postId: z.number().int().positive(),
  }),
]);
const CreateResponseSchema = z.object({ discussionid: z.number().int().positive() });
const ReplyResponseSchema = z.object({ postid: z.number().int().positive() });
const StatusResponseSchema = z.object({ status: z.boolean().optional().default(true) });

const OPERATION_BY_ACTION = {
  create: "forum.create",
  read: "forum.markRead",
  reply: "forum.reply",
  subscribe: "forum.subscribe",
} as const;

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 32_000) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const session = await requireMoodleSession();
    if (session.manifest.features.forums !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    if (session.manifest.operations[OPERATION_BY_ACTION[input.data.action]] !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "forum" || activity.data.instance === null) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const client = await createAuthenticatedMoodleClient();
    if (input.data.action === "create") {
      const created = await client.call(MOODLE_FUNCTIONS.addForumDiscussion, {
        forumid: activity.data.instance,
        subject: input.data.subject,
        message: input.data.message,
        messageformat: 2,
        groupid: 0,
      }, CreateResponseSchema);
      return Response.json({ ok: true, result: { discussionId: created.data.discussionid } });
    }
    if (!("discussionId" in input.data)) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const replyInput = input.data;
    const discussions = await client.call(MOODLE_FUNCTIONS.forumDiscussions, {
      forumid: activity.data.instance, sortorder: -1, page: 0, perpage: 100, groupid: 0,
    }, ForumDiscussionsResponseSchema);
    if (!discussions.data.discussions.some((item) => item.discussion === replyInput.discussionId)) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    if (replyInput.action === "subscribe") {
      const changed = await client.call(MOODLE_FUNCTIONS.setForumSubscription, { discussionid: replyInput.discussionId, forumid: activity.data.instance, targetstate: replyInput.subscribed }, StatusResponseSchema);
      if (!changed.data.status) return Response.json({ ok: false, error: { code: "forum_update_failed" } }, { status: 502 });
      return Response.json({ ok: true, result: { subscribed: replyInput.subscribed } });
    }
    if (replyInput.action === "read") {
      const changed = await client.call(MOODLE_FUNCTIONS.markForumRead, { discussionid: replyInput.discussionId }, StatusResponseSchema);
      if (!changed.data.status) return Response.json({ ok: false, error: { code: "forum_update_failed" } }, { status: 502 });
      return Response.json({ ok: true, result: { read: true } });
    }
    const posts = await client.call(MOODLE_FUNCTIONS.forumDiscussionPosts, {
      discussionid: replyInput.discussionId, sortby: "created", sortdirection: "ASC", includeinlineattachments: false,
    }, ForumPostsResponseSchema);
    if (!posts.data.posts.some((post) => post.id === replyInput.postId)) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const reply = await client.call(MOODLE_FUNCTIONS.addForumPost, {
      postid: replyInput.postId,
      subject: replyInput.subject,
      message: replyInput.message,
      messageformat: 2,
    }, ReplyResponseSchema);
    return Response.json({ ok: true, result: { postId: reply.data.postid } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "forum_update_failed" } }, { status: 502 });
    throw error;
  }
}
