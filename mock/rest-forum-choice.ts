import { allFields, firstField, numberField } from "./params";
import type { RestContext } from "./rest-context";
import type { MoodleFunction } from "./types";

const discussions = (context: RestContext): readonly Record<string, unknown>[] => {
  const baseline = context.user.key === "alice" ? [{
    id: 6101,
    discussion: 6001,
    name: "Questions from the field",
    subject: "Questions from the field",
    message: "What should we record when the weather changes?",
    userfullname: context.user.fullname,
    created: 1_790_000_000,
    modified: 1_790_000_000,
    numreplies: (context.state.forumPosts.get(`${context.user.key}:6001`) ?? []).length,
    numunread: context.state.readForumDiscussions.has(`${context.user.key}:6001`) ? 0 : 1,
    pinned: true,
    locked: false,
    canreply: true,
    subscribed: context.state.forumSubscriptions.has(`${context.user.key}:6001`),
  }] : [];
  const created = (context.state.forumDiscussions.get(context.user.key) ?? []).map((discussion) => ({
    id: discussion.firstPostId,
    discussion: discussion.discussionId,
    name: discussion.subject,
    subject: discussion.subject,
    message: discussion.message,
    userfullname: context.user.fullname,
    created: discussion.created,
    modified: discussion.created,
    numreplies: (context.state.forumPosts.get(`${context.user.key}:${discussion.discussionId}`) ?? []).length,
    numunread: 0,
    pinned: false,
    locked: false,
    canreply: true,
    subscribed: context.state.forumSubscriptions.has(`${context.user.key}:${discussion.discussionId}`),
  }));
  return [...baseline, ...created];
};

const posts = (context: RestContext): readonly Record<string, unknown>[] => {
  const discussionId = numberField(context.input, "discussionid") ?? 0;
  const created = context.state.forumDiscussions.get(context.user.key)?.find((item) => item.discussionId === discussionId);
  const first = discussionId === 6001 ? {
    id: 6101,
    subject: "Questions from the field",
    message: "What should we record when the weather changes?",
    author: { id: context.user.userid + 1, fullname: "Fixture Learner" },
    timecreated: 1_790_000_000,
    unread: true,
    canreply: true,
  } : created === undefined ? null : {
    id: created.firstPostId,
    subject: created.subject,
    message: created.message,
    author: { id: context.user.userid, fullname: context.user.fullname },
    timecreated: created.created,
    unread: false,
    canreply: true,
  };
  const replies = (context.state.forumPosts.get(`${context.user.key}:${discussionId}`) ?? []).map((post) => ({
    id: post.id,
    subject: post.subject,
    message: post.message,
    author: { id: context.user.userid, fullname: context.user.fullname },
    timecreated: post.created,
    unread: false,
    canreply: true,
  }));
  return first === null ? [] : [first, ...replies];
};

const addPost = (context: RestContext): Record<string, unknown> => {
  const postId = numberField(context.input, "postid") ?? 0;
  const discussion = discussions(context).find((item) => item["id"] === postId || item["discussion"] === postId);
  const discussionId = typeof discussion?.["discussion"] === "number" ? discussion["discussion"] : 6001;
  const post = {
    id: context.state.nextForumPostId,
    subject: firstField(context.input, "subject") ?? "Reply",
    message: firstField(context.input, "message") ?? "",
    created: 1_790_000_200,
  };
  context.state.nextForumPostId += 1;
  const key = `${context.user.key}:${discussionId}`;
  context.state.forumPosts.set(key, [...(context.state.forumPosts.get(key) ?? []), post]);
  return { postid: post.id, warnings: [] };
};

const addDiscussion = (context: RestContext): Record<string, unknown> => {
  const discussion = {
    created: 1_790_000_200,
    discussionId: context.state.nextForumDiscussionId,
    firstPostId: context.state.nextForumPostId,
    message: firstField(context.input, "message") ?? "",
    subject: firstField(context.input, "subject") ?? "Discussion",
  };
  context.state.nextForumDiscussionId += 1;
  context.state.nextForumPostId += 1;
  context.state.forumDiscussions.set(context.user.key, [...(context.state.forumDiscussions.get(context.user.key) ?? []), discussion]);
  return { discussionid: discussion.discussionId, warnings: [] };
};

const choiceOptions = (context: RestContext): Record<string, unknown> => {
  const selected = new Set(context.state.choiceResponses.get(`${context.user.key}:507`) ?? []);
  return {
    options: [
      { id: 7001, text: "Rocky shore", maxanswers: 0, countanswers: 4, checked: selected.has(7001), disabled: false },
      { id: 7002, text: "Tidal marsh", maxanswers: 0, countanswers: 3, checked: selected.has(7002), disabled: false },
      { id: 7003, text: "Sandy beach", maxanswers: 0, countanswers: 2, checked: selected.has(7003), disabled: false },
    ],
    warnings: [],
  };
};

export function forumChoicePayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  if (functionName === "mod_forum_get_forums_by_courses") return { forums: context.user.key === "alice" ? [{ id: 506, course: 101, cmid: 9106, name: "Observation questions", intro: "Share a question.", type: "general", cancreatediscussions: true }] : [], warnings: [] };
  if (functionName === "mod_forum_get_forum_discussions") return { discussions: discussions(context), warnings: [] };
  if (functionName === "mod_forum_get_discussion_posts") return { posts: posts(context), forumid: 506, courseid: 101, warnings: [] };
  if (functionName === "mod_forum_add_discussion_post") return addPost(context);
  if (functionName === "mod_forum_add_discussion") return addDiscussion(context);
  if (functionName === "mod_forum_set_subscription_state") {
    const discussionId = numberField(context.input, "discussionid") ?? 0;
    const key = `${context.user.key}:${discussionId}`;
    if ((firstField(context.input, "targetstate") ?? "0") === "1") context.state.forumSubscriptions.add(key);
    else context.state.forumSubscriptions.delete(key);
    return { status: true, warnings: [] };
  }
  if (functionName === "mod_forum_view_forum_discussion") {
    context.state.readForumDiscussions.add(`${context.user.key}:${numberField(context.input, "discussionid") ?? 0}`);
    return { status: true, warnings: [] };
  }
  if (functionName === "mod_forum_update_discussion_post") return { status: true, warnings: [] };
  if (functionName === "mod_choice_get_choices_by_courses") return { choices: context.user.key === "alice" ? [{ id: 507, course: 101, coursemodule: 9107, name: "Select the next field site", allowupdate: true, allowmultiple: false, timeopen: 0, timeclose: 1_790_259_200 }] : [], warnings: [] };
  if (functionName === "mod_choice_get_choice_options") return choiceOptions(context);
  if (functionName === "mod_choice_submit_choice_response") {
    const responses = allFields(context.input, "responses").map(Number).filter(Number.isFinite);
    context.state.choiceResponses.set(`${context.user.key}:507`, responses);
    return { answers: responses.map((id) => ({ id })), warnings: [] };
  }
  return undefined;
}
