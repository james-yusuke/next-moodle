import { expect, test } from "bun:test";
import { z } from "zod";

import { MoodleClient } from "@/lib/moodle/client";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleTokenSchema } from "@/lib/moodle/identifiers";
import { createMoodleMock } from "@/mock/moodle-server";

const StartSchema = z.object({ attempt: z.object({ id: z.number().int().positive() }) });
const StatusSchema = z.object({ status: z.boolean() });
const FinishSchema = z.object({ state: z.string() });
const ReplySchema = z.object({ postid: z.number().int().positive() });
const ChoiceSubmitSchema = z.object({ answers: z.array(z.unknown()) });
const QuizAttemptsSchema = z.object({ attempts: z.array(z.object({ state: z.string() })) });
const DiscussionsSchema = z.object({ discussions: z.array(z.object({ discussion: z.number().int().positive() })) });
const PostsSchema = z.object({ posts: z.array(z.object({ id: z.number().int().positive() })) });
const OptionsSchema = z.object({ options: z.array(z.object({ id: z.number().int().positive(), checked: z.boolean() })) });

test("native activities persist quiz, forum, and choice mutations for one student", async () => {
  const mock = createMoodleMock();
  const server = await mock.start();
  const client = new MoodleClient({
    config: { baseUrl: server.url, service: "moodle_mobile_app", timeoutMs: 500 },
    token: MoodleTokenSchema.parse(server.tokenFor("alice")),
  });

  try {
    const started = await client.call(MOODLE_FUNCTIONS.startQuizAttempt, { quizid: 505 }, StartSchema);
    const attemptId = started.data.attempt.id;
    await client.call(MOODLE_FUNCTIONS.saveQuizAttempt, {
      attemptid: attemptId,
      "data[0][name]": `q${attemptId}:1_answer`,
      "data[0][value]": "Water temperature",
    }, StatusSchema);
    await client.call(MOODLE_FUNCTIONS.processQuizAttempt, { attemptid: attemptId, finishattempt: true }, FinishSchema);
    const attempts = await client.call(MOODLE_FUNCTIONS.quizAttempts, { quizid: 505, userid: 101, status: "all" }, QuizAttemptsSchema);

    const discussions = await client.call(MOODLE_FUNCTIONS.forumDiscussions, { forumid: 506 }, DiscussionsSchema);
    const discussionId = discussions.data.discussions[0]?.discussion;
    expect(discussionId).toBeDefined();
    if (discussionId === undefined) return;
    const postsBefore = await client.call(MOODLE_FUNCTIONS.forumDiscussionPosts, { discussionid: discussionId }, PostsSchema);
    await client.call(MOODLE_FUNCTIONS.addForumPost, { postid: postsBefore.data.posts[0]?.id ?? 0, subject: "Re: Question", message: "Record wind and cloud cover.", messageformat: 2 }, ReplySchema);
    const postsAfter = await client.call(MOODLE_FUNCTIONS.forumDiscussionPosts, { discussionid: discussionId }, PostsSchema);

    await client.call(MOODLE_FUNCTIONS.submitChoice, { choiceid: 507, responses: [7002] }, ChoiceSubmitSchema);
    const options = await client.call(MOODLE_FUNCTIONS.choiceOptions, { choiceid: 507 }, OptionsSchema);

    expect(attempts.data.attempts[0]?.state).toBe("finished");
    expect(postsAfter.data.posts.length).toBe(postsBefore.data.posts.length + 1);
    expect(options.data.options.find((option) => option.id === 7002)?.checked).toBe(true);
  } finally {
    await mock.stop();
  }
});
