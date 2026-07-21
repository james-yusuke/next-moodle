import { z } from "zod";

const RoleShortnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);

export function readTeacherRoleShortnames(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): readonly string[] {
  const source = environment.MOODLE_TEACHER_ROLE_SHORTNAMES ?? "editingteacher,teacher";
  const result: string[] = [];
  for (const value of source.split(",")) {
    const parsed = RoleShortnameSchema.parse(value);
    if (!result.includes(parsed)) result.push(parsed);
  }
  if (result.length === 0 || result.length > 20) {
    throw new Error("Invalid Moodle teacher role configuration.");
  }
  return result;
}
