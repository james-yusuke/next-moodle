import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { TeacherContactForm } from "@/components/messages/teacher-contact-form";
import { requireMoodleSession } from "@/lib/auth/server";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readCourses } from "@/lib/moodle/queries/courses";

export const metadata: Metadata = { title: "先生へ連絡" };

export default async function NewTeacherMessagePage({ searchParams }: Readonly<{
  searchParams: Promise<{ courseId?: string | string[] }>;
}>) {
  const session = await requireMoodleSession();
  if (session.manifest.features.people !== "available" || session.manifest.operations["message.sendDirect"] !== "available") {
    return <StateNotice reason="capability" retryHref="/messages/new" siteUrl={session.site.siteUrl} />;
  }
  const courses = await readCourses(session.userId, currentUnixSeconds());
  if (courses.kind === "failure") return <StateNotice reason={courses.reason} retryHref="/messages/new" siteUrl={session.site.siteUrl} />;
  const courseIdParam = (await searchParams).courseId;
  const initialCourseId = typeof courseIdParam === "string" && /^\d+$/.test(courseIdParam)
    ? Number(courseIdParam)
    : null;
  return <TeacherContactForm
    courses={courses.data.filter((course) => course.classification === "active").map((course) => ({ id: course.id, name: course.name, shortName: course.shortName }))}
    initialCourseId={initialCourseId}
  />;
}
