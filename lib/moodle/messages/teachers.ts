import "server-only";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import {
  MOODLE_FUNCTIONS,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { moodleFileProxyPath } from "@/lib/security/moodle-file";
import { EnrolledUsersSchema } from "../student-dto";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";

export type CourseTeacherCandidate = Readonly<{
  avatarUrl: string | null;
  displayName: string;
  id: MoodleUserId;
  roles: readonly string[];
}>;

type ReadCourseTeachersInput = Readonly<{
  courseId: MoodleCourseId;
  roleShortnames: readonly string[];
  siteUrl: string;
  viewerId: MoodleUserId;
}>;

export async function readCourseTeacherCandidates(
  input: ReadCourseTeachersInput,
): Promise<MoodleReadResult<readonly CourseTeacherCandidate[]>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const enrolled = await client.call(
      MOODLE_FUNCTIONS.enrolledCourses,
      { userid: input.viewerId },
      MoodleEnrolledCoursesResponseSchema,
    );
    if (!enrolled.data.some((course) => course.id === input.courseId && course.visible !== 0)) {
      return { kind: "failure", reason: "permission" };
    }
    const response = await client.call(MOODLE_FUNCTIONS.participants, {
      courseid: input.courseId,
      "options[0][name]": "limitfrom",
      "options[0][value]": 0,
      "options[1][name]": "limitnumber",
      "options[1][value]": 500,
    }, EnrolledUsersSchema);
    const acceptedRoles = new Set(input.roleShortnames);
    return {
      kind: "ready",
      data: response.data.flatMap((person): readonly CourseTeacherCandidate[] => {
        const roles = person.roles
          .filter((role) => acceptedRoles.has(role.shortname))
          .map((role) => role.name);
        if (roles.length === 0 || person.id === input.viewerId) return [];
        const avatarUrl = person.profileimageurlsmall === undefined
          ? null
          : moodleFileProxyPath(person.profileimageurlsmall, input.siteUrl);
        return [{
          avatarUrl,
          displayName: person.fullname,
          id: person.id as MoodleUserId,
          roles,
        }];
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
