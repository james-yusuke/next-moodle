import { firstField, numberField } from "./params";
import type { RestContext } from "./rest-context";
import type { FixtureUser, MoodleFunction } from "./types";

const attemptKey = (user: FixtureUser, quizId: number): string => `${user.key}:${quizId}`;

const wireAttempt = (context: RestContext, quizId: number): Record<string, unknown>[] => {
  const stored = context.state.quizAttempts.get(attemptKey(context.user, quizId));
  if (stored === undefined) return [];
  return [{
    id: stored.id,
    quiz: stored.quiz,
    userid: context.user.userid,
    attempt: stored.attempt,
    currentpage: 0,
    state: stored.state,
    timestart: 1_790_000_000,
    timefinish: stored.state === "finished" ? 1_790_000_500 : 0,
    timemodified: 1_790_000_100,
    sumgrades: stored.state === "finished" ? 8 : null,
  }];
};

const startAttempt = (context: RestContext): Record<string, unknown> => {
  const quizId = numberField(context.input, "quizid") ?? 505;
  const key = attemptKey(context.user, quizId);
  const existing = context.state.quizAttempts.get(key);
  const stored = existing?.state === "inprogress" ? existing : {
    attempt: existing === undefined ? 1 : existing.attempt + 1,
    id: context.state.nextQuizAttemptId,
    quiz: quizId,
    responses: {},
    state: "inprogress" as const,
    user: context.user.key,
  };
  if (stored !== existing) context.state.nextQuizAttemptId += 1;
  context.state.quizAttempts.set(key, stored);
  return { attempt: wireAttempt(context, quizId)[0], warnings: [] };
};

const responsesFrom = (context: RestContext): Readonly<Record<string, string>> => {
  const responses: Record<string, string> = {};
  for (let index = 0; index < 500; index += 1) {
    const name = firstField(context.input, `data[${index}][name]`);
    if (name === undefined) break;
    responses[name] = firstField(context.input, `data[${index}][value]`) ?? "";
  }
  return responses;
};

const updateAttempt = (context: RestContext, finish: boolean): Record<string, unknown> => {
  const attemptId = numberField(context.input, "attemptid") ?? 0;
  const entry = [...context.state.quizAttempts.entries()].find(([, attempt]) =>
    attempt.user === context.user.key && attempt.id === attemptId
  );
  if (entry !== undefined) {
    const [key, attempt] = entry;
    context.state.quizAttempts.set(key, {
      ...attempt,
      responses: { ...attempt.responses, ...responsesFrom(context) },
      state: finish ? "finished" : "inprogress",
    });
  }
  return finish ? { state: "finished", warnings: [] } : { status: true, warnings: [] };
};

const attemptData = (context: RestContext): Record<string, unknown> => {
  const attemptId = numberField(context.input, "attemptid") ?? 0;
  const quizId = 505;
  const attempt = wireAttempt(context, quizId).find((candidate) => candidate["id"] === attemptId) ?? {};
  const stored = context.state.quizAttempts.get(attemptKey(context.user, quizId));
  const answerName = `q${attemptId}:1_answer`;
  const answer = stored?.responses[answerName] ?? "";
  return {
    attempt,
    messages: [],
    nextpage: -1,
    questions: [{
      slot: 1,
      type: "shortanswer",
      page: 0,
      html: `<div class="formulation"><p>Name one field observation to record consistently.</p><label for="quiz-answer">Answer</label><input id="quiz-answer" name="${answerName}" type="text" value="${answer}"><input name="q${attemptId}:1_:sequencecheck" type="hidden" value="1"></div>`,
      sequencecheck: 1,
      state: "todo",
      status: answer === "" ? "Not yet answered" : "Answer saved",
    }],
    warnings: [],
  };
};

export function quizPayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  if (functionName === "mod_quiz_get_quizzes_by_courses") return {
    quizzes: context.user.key === "alice" ? [{ id: 505, course: 101, coursemodule: 9105, name: "Week 1 knowledge check", intro: "Check your understanding of the observation guide.", timeopen: 0, timeclose: 1_790_259_200, timelimit: 900, attempts: 2, grade: 10, hasquestions: 1 }] : [],
    warnings: [],
  };
  if (functionName === "mod_quiz_get_user_attempts") return { attempts: wireAttempt(context, numberField(context.input, "quizid") ?? 505), warnings: [] };
  if (functionName === "mod_quiz_start_attempt") return startAttempt(context);
  if (functionName === "mod_quiz_get_attempt_data") return attemptData(context);
  if (functionName === "mod_quiz_save_attempt") return updateAttempt(context, false);
  if (functionName === "mod_quiz_process_attempt") return updateAttempt(context, true);
  return undefined;
}
