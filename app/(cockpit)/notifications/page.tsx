import type { Metadata } from "next";

import {
  createAuthenticatedMoodleClient,
  requireMoodleSession,
} from "@/lib/auth/server";
import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleFunctionError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "@/lib/moodle/errors";
import { loadNotifications } from "@/lib/moodle/queries/notifications";
import type { NotificationsPageState } from "@/lib/moodle/queries/notifications-schema";

import { NotificationsClient } from "@/components/notifications/notifications-client";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "通知",
  description: "Moodleから届くフィードバックやお知らせを確認します。",
};

function stateFromError(error: Error): NotificationsPageState {
  if (error instanceof MoodleAuthError) {
    return { kind: "auth" };
  }
  if (error instanceof MoodlePermissionError) {
    return { kind: "permission" };
  }
  if (error instanceof MoodleFunctionError) {
    return { kind: "capability" };
  }
  if (error instanceof MoodleOutageError) {
    return { kind: "outage" };
  }
  if (error instanceof MoodleResponseError || error instanceof MoodleConfigurationError) {
    return { kind: "error" };
  }
  return { kind: "error" };
}

export default async function NotificationsPage() {
  const runtimeConfig = readAppRuntimeConfig();
  let initialState: NotificationsPageState;
  try {
    const session = await requireMoodleSession();
    if (session.manifest.features.notifications !== "available") {
      initialState = { kind: "capability" };
    } else {
      const client = await createAuthenticatedMoodleClient();
      initialState = {
        kind: "ready",
        data: await loadNotifications(
          client,
          session.userId,
          session.site.siteUrl,
        ),
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      initialState = stateFromError(error);
    } else {
      throw error;
    }
  }
  return <NotificationsClient initialState={initialState} runtimeConfig={runtimeConfig} />;
}
