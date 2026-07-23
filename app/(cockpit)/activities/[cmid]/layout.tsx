import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { resolveMoodlePageFailure } from "@/components/app-shell/state-notice";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";

import { readActivityPageData } from "./activity-page-data";

export default async function ActivityAccessLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ cmid: string }>;
}>) {
  const route = await params;
  const cmid = MoodleCourseModuleIdSchema.safeParse(Number(route.cmid));
  if (!cmid.success) {
    notFound();
  }
  const { result } = await readActivityPageData(cmid.data);
  if (result.kind === "failure") {
    resolveMoodlePageFailure(result.reason);
  } else if (result.data === null) {
    notFound();
  }
  return children;
}
