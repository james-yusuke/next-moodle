import { z } from "zod";

export const ACTIVITY_MODULE_NAMES = [
  "assign", "quiz", "forum", "choice", "feedback", "lesson", "glossary",
  "wiki", "data", "workshop", "scorm", "h5pactivity", "lti",
  "bigbluebuttonbn", "book", "resource", "folder", "imscp", "page", "url",
] as const;

export const ActivityModuleNameSchema = z.enum(ACTIVITY_MODULE_NAMES);
export type ActivityModuleName = z.infer<typeof ActivityModuleNameSchema>;
