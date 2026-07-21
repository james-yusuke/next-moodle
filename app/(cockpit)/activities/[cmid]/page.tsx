import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActivityWorkspace } from "@/components/activities/activity-workspace";
import { StateNotice } from "@/components/app-shell/state-notice";
import { Notice } from "@/components/ui";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readChoiceActivity } from "@/lib/moodle/activities/choice";
import { readDatabaseActivity } from "@/lib/moodle/activities/database";
import { readFeedbackActivity } from "@/lib/moodle/activities/feedback";
import { readForumActivity } from "@/lib/moodle/activities/forum";
import { readGlossaryActivity } from "@/lib/moodle/activities/glossary";
import { readLessonActivity } from "@/lib/moodle/activities/lesson";
import { readLaunchActivity } from "@/lib/moodle/activities/launch";
import type { NativeActivityData } from "@/lib/moodle/activities/native";
import { readQuizActivity } from "@/lib/moodle/activities/quiz";
import { readWikiActivity } from "@/lib/moodle/activities/wiki";
import { readWorkshopActivity } from "@/lib/moodle/activities/workshop";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const metadata: Metadata = { title: "アクティビティ" };

type ActivityPageProps = Readonly<{
  params: Promise<{ cmid: string }>;
  searchParams: Promise<{ discussion?: string; feedbackPage?: string; lessonPage?: string; page?: string }>;
}>;

export default async function ActivityPage({ params, searchParams }: ActivityPageProps) {
  const session = await requireMoodleSession();
  const route = await params;
  const cmid = MoodleCourseModuleIdSchema.safeParse(Number(route.cmid));
  if (!cmid.success) {
    return <Notice title="アクティビティが見つかりません" tone="warning"><p>コース画面からもう一度選択してください。</p></Notice>;
  }
  const result = await readActivityWorkspace({
    cmid: cmid.data,
    manifest: session.manifest,
    siteUrl: session.site.siteUrl,
    userId: session.userId,
  });
  if (result.kind === "failure") {
    return <StateNotice reason={result.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
  }
  if (result.data === null) {
    return <Notice title="アクティビティが見つかりません" tone="warning"><p>このアカウントで表示できるコースから選択してください。</p></Notice>;
  }
  if (result.data.moduleType === "assign") {
    redirect(`/assignments/${cmid.data}`);
  }
  const query = await searchParams;
  const requestedPage = Number(query.page ?? "0");
  const requestedDiscussion = Number(query.discussion ?? "0");
  let native: NativeActivityData | null | undefined;
  if (result.data.moduleType === "quiz" && session.manifest.features.quizzes === "available") {
    const quizResult = await readQuizActivity({
        cmid: cmid.data,
        courseId: result.data.course.id,
        instance: result.data.instance,
        page: Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0,
        siteUrl: session.site.siteUrl,
        userId: session.userId,
      });
    if (quizResult.kind === "failure") return <StateNotice reason={quizResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = quizResult.data === null ? null : { kind: "quiz", data: quizResult.data };
  } else if (result.data.moduleType === "forum" && session.manifest.features.forums === "available") {
    const forumResult = await readForumActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      manifest: session.manifest,
      selectedDiscussionId: Number.isInteger(requestedDiscussion) && requestedDiscussion > 0 ? requestedDiscussion : null,
      siteUrl: session.site.siteUrl,
    });
    if (forumResult.kind === "failure") return <StateNotice reason={forumResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = forumResult.data === null ? null : { kind: "forum", data: forumResult.data };
  } else if (result.data.moduleType === "choice" && session.manifest.features.choice === "available") {
    const choiceResult = await readChoiceActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance });
    if (choiceResult.kind === "failure") return <StateNotice reason={choiceResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = choiceResult.data === null ? null : { kind: "choice", data: choiceResult.data };
  } else if (result.data.moduleType === "glossary" && session.manifest.features.glossary === "available") {
    const glossaryResult = await readGlossaryActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (glossaryResult.kind === "failure") return <StateNotice reason={glossaryResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = glossaryResult.data === null ? null : { kind: "glossary", data: glossaryResult.data };
  } else if (result.data.moduleType === "wiki" && session.manifest.features.wiki === "available") {
    const wikiResult = await readWikiActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (wikiResult.kind === "failure") return <StateNotice reason={wikiResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = wikiResult.data === null ? null : { kind: "wiki", data: wikiResult.data };
  } else if (result.data.moduleType === "feedback" && session.manifest.features.feedback === "available") {
    const feedbackPage = query.feedbackPage === undefined ? null : Number(query.feedbackPage);
    const feedbackResult = await readFeedbackActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      page: feedbackPage !== null && Number.isInteger(feedbackPage) && feedbackPage >= 0 ? feedbackPage : null,
    });
    if (feedbackResult.kind === "failure") return <StateNotice reason={feedbackResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = feedbackResult.data === null ? null : { kind: "feedback", data: feedbackResult.data };
  } else if (result.data.moduleType === "lesson" && session.manifest.features.lesson === "available") {
    const lessonPage = query.lessonPage === undefined ? null : Number(query.lessonPage);
    const lessonResult = await readLessonActivity({
      cmid: cmid.data,
      courseId: result.data.course.id,
      instance: result.data.instance,
      pageId: lessonPage !== null && Number.isInteger(lessonPage) && lessonPage >= 0 ? lessonPage : null,
      siteUrl: session.site.siteUrl,
    });
    if (lessonResult.kind === "failure") return <StateNotice reason={lessonResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = lessonResult.data === null ? null : { kind: "lesson", data: lessonResult.data };
  } else if (result.data.moduleType === "data" && session.manifest.features.database === "available") {
    const databaseResult = await readDatabaseActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl });
    if (databaseResult.kind === "failure") return <StateNotice reason={databaseResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = databaseResult.data === null ? null : { kind: "database", data: databaseResult.data };
  } else if (result.data.moduleType === "workshop" && session.manifest.features.workshop === "available") {
    const workshopResult = await readWorkshopActivity({ cmid: cmid.data, courseId: result.data.course.id, instance: result.data.instance, siteUrl: session.site.siteUrl, userId: session.userId });
    if (workshopResult.kind === "failure") return <StateNotice reason={workshopResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    native = workshopResult.data === null ? null : { kind: "workshop", data: workshopResult.data };
  } else {
    const launchFeatureAvailable = result.data.moduleType === "url"
      || (result.data.moduleType === "scorm" && session.manifest.features.scorm === "available")
      || (result.data.moduleType === "h5pactivity" && session.manifest.features.h5p === "available")
      || (result.data.moduleType === "lti" && session.manifest.features.lti === "available")
      || (result.data.moduleType === "bigbluebuttonbn" && session.manifest.features.bigBlueButton === "available");
    if (launchFeatureAvailable) {
      const launchResult = await readLaunchActivity({
        cmid: cmid.data,
        courseId: result.data.course.id,
        instance: result.data.instance,
        moduleType: result.data.moduleType,
        name: result.data.name,
        sourceUrl: result.data.sourceUrl,
        userId: session.userId,
      });
      if (launchResult.kind === "failure") return <StateNotice reason={launchResult.reason} retryHref={`/activities/${cmid.data}`} siteUrl={session.site.siteUrl} />;
      native = launchResult.data === null ? null : { kind: "launch", data: launchResult.data };
    }
  }
  return <ActivityWorkspace
    canUpdateCompletion={session.manifest.features.completionUpdate === "available"}
    config={readAppRuntimeConfig()}
    data={result.data}
    native={native}
  />;
}
