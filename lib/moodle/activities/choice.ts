import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";

const ChoiceSchema = z.object({
  id: z.number().int().positive(),
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
  allowupdate: z.union([z.boolean(), z.number().int()]).optional().default(false),
  allowmultiple: z.union([z.boolean(), z.number().int()]).optional().default(false),
  timeopen: z.number().int().nonnegative().optional().default(0),
  timeclose: z.number().int().nonnegative().optional().default(0),
});
const ChoiceOptionSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().min(1).max(16_384),
  maxanswers: z.number().int().nonnegative().optional().default(0),
  countanswers: z.number().int().nonnegative().optional().default(0),
  checked: z.union([z.boolean(), z.number().int()]).transform(Boolean),
  disabled: z.union([z.boolean(), z.number().int()]).transform(Boolean),
});
const ChoicesResponseSchema = z.object({ choices: z.array(ChoiceSchema) });
export const ChoiceOptionsResponseSchema = z.object({ options: z.array(ChoiceOptionSchema) });

export type ChoiceActivityData = Readonly<{
  allowMultiple: boolean;
  allowUpdate: boolean;
  id: number;
  name: string;
  options: readonly Readonly<z.infer<typeof ChoiceOptionSchema>>[];
  timeClose: number;
  timeOpen: number;
}>;

type ChoiceRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
}>;

export async function readChoiceActivity(
  request: ChoiceRequest,
): Promise<MoodleReadResult<ChoiceActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const choices = await client.call(
      MOODLE_FUNCTIONS.choices,
      { courseids: [request.courseId] },
      ChoicesResponseSchema,
    );
    const choice = choices.data.choices.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (choice === undefined) return { kind: "ready", data: null };
    const options = await client.call(
      MOODLE_FUNCTIONS.choiceOptions,
      { choiceid: choice.id },
      ChoiceOptionsResponseSchema,
    );
    return {
      kind: "ready",
      data: {
        allowMultiple: Boolean(choice.allowmultiple),
        allowUpdate: Boolean(choice.allowupdate),
        id: choice.id,
        name: choice.name,
        options: options.data.options,
        timeClose: choice.timeclose,
        timeOpen: choice.timeopen,
      },
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
