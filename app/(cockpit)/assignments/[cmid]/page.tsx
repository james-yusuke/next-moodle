import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { AssignmentDetailView } from "@/components/assignments/assignment-detail";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import {
  AssignmentNotFoundError,
  MoodleCourseModulePathSchema,
} from "@/lib/moodle/queries/assignments";
import { fetchAssignmentDetail } from "@/lib/moodle/queries/assignments.query";
import { toMoodleReadFailure } from "@/lib/moodle/queries/dashboard";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { createAiUiContext } from "@/lib/ai/runtime";

export const metadata: Metadata = { title: "課題" };

type AssignmentPageProps = Readonly<{ params: Promise<{ cmid: string }> }>;

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  const route = await params;
  const cmid = MoodleCourseModulePathSchema.safeParse(route.cmid);
  if (!cmid.success) {
    notFound();
  }
  if (session.manifest.features.assignmentsRead !== "available") {
    return <StateNotice reason="capability" retryHref={`/assignments/${cmid.data}`} siteUrl={session.site.siteUrl} />;
  }
  let data;
  try {
    data = await fetchAssignmentDetail(
      { client: await createAuthenticatedMoodleClient(), now: currentUnixSeconds(), session },
      cmid.data,
    );
  } catch (error) {
    if (error instanceof AssignmentNotFoundError) {
      notFound();
    }
    const failure = toMoodleReadFailure(error);
    if (failure.kind === "failure") {
      return <StateNotice reason={resolveMoodlePageFailure(failure.reason)} retryHref={`/assignments/${cmid.data}`} siteUrl={session.site.siteUrl} />;
    }
    throw error;
  }
  const draftStorageKey = `next-moodle:draft:${createHash("sha256")
    .update(`${session.site.siteUrl}|${session.userId}|${cmid.data}`)
    .digest("base64url")}`;
  const ai = createAiUiContext({ siteUrl: session.site.siteUrl, userId: session.userId });
  return (
    <AssignmentDetailView
      aiAvailability={ai.availability}
      aiConsentStorageKey={ai.consentStorageKey}
      config={config}
      data={data}
      draftStorageKey={draftStorageKey}
    />
  );
}
