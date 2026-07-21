import { z } from "zod";

export const MoodleTokenSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[^\s]+$/)
  .brand("MoodleToken");
export type MoodleToken = z.infer<typeof MoodleTokenSchema>;

export const MoodleUserIdSchema = z.number().int().positive().brand("MoodleUserId");
export type MoodleUserId = z.infer<typeof MoodleUserIdSchema>;

export const MoodleCourseIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleCourseId");
export type MoodleCourseId = z.infer<typeof MoodleCourseIdSchema>;

export const MoodleSectionIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleSectionId");
export type MoodleSectionId = z.infer<typeof MoodleSectionIdSchema>;

export const MoodleCourseModuleIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleCourseModuleId");
export type MoodleCourseModuleId = z.infer<typeof MoodleCourseModuleIdSchema>;

export const MoodleAssignmentIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleAssignmentId");
export type MoodleAssignmentId = z.infer<typeof MoodleAssignmentIdSchema>;

export const MoodleCalendarEventIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleCalendarEventId");
export type MoodleCalendarEventId = z.infer<typeof MoodleCalendarEventIdSchema>;

export const MoodleNotificationIdSchema = z
  .number()
  .int()
  .positive()
  .brand("MoodleNotificationId");
export type MoodleNotificationId = z.infer<typeof MoodleNotificationIdSchema>;

export const MoodleCredentialsSchema = z.object({
  username: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(4096),
});
export type MoodleCredentials = z.infer<typeof MoodleCredentialsSchema>;
