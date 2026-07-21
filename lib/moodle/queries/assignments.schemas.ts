import { z } from "zod";

import {
  MoodleAssignmentIdSchema,
  MoodleCourseIdSchema,
  MoodleCourseModuleIdSchema,
} from "../identifiers";

const MoodleTextSchema = z.string().max(16_384);
const MoodleHtmlSchema = z.string().max(1_000_000);
const MoodleTimestampSchema = z.number().int().nonnegative();
const MoodleFlagSchema = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((value) => value === true || value === 1);

export const MoodleAssignmentConfigSchema = z.object({
  plugin: z.string().min(1).max(128),
  subtype: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  value: z.union([z.string().max(16_384), z.number(), z.boolean()]),
});

export const MoodleAssignmentWireSchema = z.object({
  id: MoodleAssignmentIdSchema,
  cmid: MoodleCourseModuleIdSchema,
  course: MoodleCourseIdSchema,
  name: MoodleTextSchema,
  intro: MoodleHtmlSchema.optional().default(""),
  allowsubmissionsfromdate: MoodleTimestampSchema.optional().default(0),
  duedate: MoodleTimestampSchema.optional().default(0),
  cutoffdate: MoodleTimestampSchema.optional().default(0),
  gradingduedate: MoodleTimestampSchema.optional().default(0),
  nosubmissions: MoodleFlagSchema.optional().default(false),
  submissiondrafts: MoodleFlagSchema.optional().default(false),
  requiresubmissionstatement: MoodleFlagSchema.optional().default(false),
  teamsubmission: MoodleFlagSchema.optional().default(false),
  submissionattachments: z.number().int().nonnegative().optional().default(0),
  maxfilesubmissions: z.number().int().nonnegative().optional().default(0),
  maxsubmissionsizebytes: z.number().int().nonnegative().optional().default(0),
  configs: z.array(MoodleAssignmentConfigSchema).max(1_000).optional().default([]),
});
export type MoodleAssignmentWire = Readonly<
  z.infer<typeof MoodleAssignmentWireSchema>
>;

export const MoodleAssignmentCourseSchema = z.object({
  id: MoodleCourseIdSchema,
  fullname: MoodleTextSchema,
  assignments: z.array(MoodleAssignmentWireSchema).max(10_000),
});

export const MoodleAssignmentsWireResponseSchema = z.object({
  courses: z.array(MoodleAssignmentCourseSchema).max(10_000),
});

export const MoodleSubmissionFileSchema = z.object({
  filename: MoodleTextSchema,
  filepath: z.string().max(4_096).optional().default("/"),
  filesize: z.number().int().nonnegative().optional().default(0),
  mimetype: z.string().max(256).optional().default("application/octet-stream"),
  fileurl: z.url().max(4_096).optional(),
  timemodified: MoodleTimestampSchema.optional().default(0),
});

const MoodleSubmissionFileAreaSchema = z.object({
  area: z.string().max(128).optional(),
  files: z.array(MoodleSubmissionFileSchema).max(1_000).optional().default([]),
});

const MoodleSubmissionEditorFieldSchema = z.object({
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
  text: MoodleHtmlSchema.optional().default(""),
  format: z.number().int().nonnegative().optional(),
});

export const MoodleSubmissionPluginSchema = z.object({
  type: z.string().min(1).max(128),
  name: MoodleTextSchema.optional(),
  fileareas: z.array(MoodleSubmissionFileAreaSchema).max(100).optional().default([]),
  editorfields: z
    .array(MoodleSubmissionEditorFieldSchema)
    .max(100)
    .optional()
    .default([]),
});

export const MoodleSubmissionSchema = z.object({
  assignment: MoodleAssignmentIdSchema.optional(),
  assignmentid: MoodleAssignmentIdSchema.optional(),
  status: z.string().min(1).max(128).optional().default("new"),
  gradingstatus: z.string().max(128).optional().default("notgraded"),
  attemptnumber: z.number().int().nonnegative().optional().default(0),
  timestarted: MoodleTimestampSchema.optional().default(0),
  timemodified: MoodleTimestampSchema.optional().default(0),
  groupid: z.number().int().nonnegative().optional().default(0),
  plugins: z.array(MoodleSubmissionPluginSchema).max(100).optional().default([]),
});

const MoodleLastAttemptSchema = z.object({
  submission: MoodleSubmissionSchema.optional(),
  submissionsenabled: MoodleFlagSchema.optional().default(true),
  locked: MoodleFlagSchema.optional().default(false),
  graded: MoodleFlagSchema.optional().default(false),
  canedit: MoodleFlagSchema.optional().default(false),
  cansubmit: MoodleFlagSchema.optional().default(false),
  extensionduedate: MoodleTimestampSchema.optional().default(0),
  gradingstatus: z.string().max(128).optional().default("notgraded"),
});

const MoodleFeedbackSchema = z.object({
  gradefordisplay: MoodleHtmlSchema.optional(),
  gradeddate: MoodleTimestampSchema.optional().default(0),
  plugins: z.array(MoodleSubmissionPluginSchema).max(100).optional().default([]),
});

export const MoodleSubmissionStatusSchema = z.object({
  lastattempt: MoodleLastAttemptSchema.optional(),
  feedback: z.union([
    MoodleFeedbackSchema,
    z.array(z.unknown()).max(1_000),
  ]).optional(),
});
export type MoodleSubmissionStatus = Readonly<
  z.infer<typeof MoodleSubmissionStatusSchema>
>;
