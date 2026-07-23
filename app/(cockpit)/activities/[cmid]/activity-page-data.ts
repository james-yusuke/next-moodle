import "server-only";

import { cache } from "react";

import { requireMoodleSession } from "@/lib/auth/server";
import type { MoodleCourseModuleId } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const readActivityPageData = cache(async (cmid: MoodleCourseModuleId) => {
  const session = await requireMoodleSession();
  const result = await readActivityWorkspace({
    cmid,
    manifest: session.manifest,
    siteUrl: session.site.siteUrl,
    userId: session.userId,
  });
  return { result, session };
});
