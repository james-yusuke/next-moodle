import type { MoodleClient } from "../client";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseModuleId } from "../identifiers";
import type { MoodleSession } from "../site";
import {
  AssignmentNotFoundError,
  projectAssignmentDetail,
  type AssignmentDetail,
} from "./assignments";
import {
  MoodleAssignmentsWireResponseSchema,
  MoodleSubmissionStatusSchema,
} from "./assignments.schemas";

type AssignmentQueryContext = Readonly<{
  client: MoodleClient;
  now: number;
  session: MoodleSession;
}>;

export async function fetchAssignmentDetail(
  context: AssignmentQueryContext,
  cmid: MoodleCourseModuleId,
): Promise<AssignmentDetail> {
  const assignments = await context.client.call(
    MOODLE_FUNCTIONS.assignments,
    {},
    MoodleAssignmentsWireResponseSchema,
  );
  for (const course of assignments.data.courses) {
    const assignment = course.assignments.find((candidate) => candidate.cmid === cmid);
    if (assignment === undefined) {
      continue;
    }
    const submission = await context.client.call(
      MOODLE_FUNCTIONS.assignmentStatus,
      { assignid: assignment.id },
      MoodleSubmissionStatusSchema,
    );
    return projectAssignmentDetail({
      assignment,
      availableFunctions: context.session.site.availableFunctions,
      course,
      fileUpload: context.session.capabilities.fileUpload,
      now: context.now,
      siteUrl: context.session.site.siteUrl,
      submission: submission.data,
    });
  }
  throw new AssignmentNotFoundError();
}
