import "server-only";

import { cache } from "react";
import { z } from "zod";

import {
  MOODLE_FUNCTIONS,
  MoodleCourseModuleSchema,
  MoodleCourseSectionSchema,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleDashboardCourse,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import {
  activityDestination,
  projectCourseList,
  type ActivityDestination,
  type CourseListItem,
} from "./courses-model";
import {
  toMoodleReadFailure,
  type MoodleReadResult,
} from "./dashboard";

const CourseModuleWithUrlSchema = MoodleCourseModuleSchema.extend({
  url: z.url().optional(),
});
const CourseSectionWithUrlsSchema = MoodleCourseSectionSchema.extend({
  modules: z.array(CourseModuleWithUrlSchema),
});
const CourseSectionsWithUrlsSchema = z.array(CourseSectionWithUrlsSchema);

export type CommandCourse = {
  readonly href: string;
  readonly name: string;
  readonly shortName: string;
};

export type CourseActivity = {
  readonly destination: ActivityDestination;
  readonly id: number;
  readonly moduleType: string;
  readonly name: string;
};

export type CourseSection = {
  readonly activities: readonly CourseActivity[];
  readonly id: number;
  readonly name: string;
};

export type CourseDetail = {
  readonly course: CourseListItem;
  readonly sections: readonly CourseSection[];
};

type CourseDetailRequest = {
  readonly courseId: MoodleCourseId;
  readonly nowSeconds: number;
  readonly siteUrl: string;
  readonly userId: MoodleUserId;
};

const readEnrolledCourses = cache(
  async (
    userId: MoodleUserId,
  ): Promise<MoodleReadResult<readonly MoodleDashboardCourse[]>> => {
    try {
      const client = await createAuthenticatedMoodleClient();
      const result = await client.call(
        MOODLE_FUNCTIONS.enrolledCourses,
        { userid: userId },
        MoodleEnrolledCoursesResponseSchema,
      );
      return { kind: "ready", data: result.data };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);

export const readCourses = cache(
  async (
    userId: MoodleUserId,
    nowSeconds: number,
  ): Promise<MoodleReadResult<readonly CourseListItem[]>> => {
    const result = await readEnrolledCourses(userId);
    return result.kind === "failure"
      ? result
      : { kind: "ready", data: projectCourseList(result.data, nowSeconds) };
  },
);

export const readCommandCourses = cache(
  async (
    userId: MoodleUserId,
  ): Promise<MoodleReadResult<readonly CommandCourse[]>> => {
    const result = await readEnrolledCourses(userId);
    if (result.kind === "failure") {
      return result;
    }
    return {
      kind: "ready",
      data: result.data
        .filter((course) => course.visible !== 0)
        .map((course) => ({
          href: `/courses/${course.id}`,
          name: course.fullname,
          shortName: course.shortname,
        })),
    };
  },
);

export const readCourseDetail = cache(
  async (
    request: CourseDetailRequest,
  ): Promise<MoodleReadResult<CourseDetail | null>> => {
    const enrolled = await readEnrolledCourses(request.userId);
    if (enrolled.kind === "failure") {
      return enrolled;
    }
    const course = enrolled.data.find((candidate) => candidate.id === request.courseId);
    if (course === undefined || course.visible === 0) {
      return { kind: "ready", data: null };
    }
    try {
      const client = await createAuthenticatedMoodleClient();
      const contents = await client.call(
        MOODLE_FUNCTIONS.courseContents,
        { courseid: request.courseId },
        CourseSectionsWithUrlsSchema,
      );
      const courseItem = projectCourseList([course], request.nowSeconds)[0];
      if (courseItem === undefined) {
        return { kind: "ready", data: null };
      }
      return {
        kind: "ready",
        data: {
          course: courseItem,
          sections: contents.data
            .filter((section) => section.visible !== 0)
            .map((section) => ({
              activities: section.modules.map((module) => ({
                destination: activityDestination(module, request.siteUrl),
                id: module.id,
                moduleType: module.modname,
                name: module.name,
              })),
              id: section.id,
              name: section.name,
            })),
        },
      };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);
