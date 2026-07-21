import ky from "ky";
import { z } from "zod";

import type { MoodleClient } from "../client";
import { uploadEndpoint } from "../config";
import { MoodleOutageError, MoodleResponseError } from "../errors";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleAssignmentId } from "../identifiers";
import type { MoodleParams } from "../params";
import { readMoodleJson } from "../response";
import type { MoodleSession } from "../site";
import type { SubmissionPayload } from "./input";

const MoodleUploadItemSchema = z.object({
  itemid: z.number().int().positive(),
  filename: z.string().min(1).max(1_024),
  filepath: z.string().max(4_096),
  filesize: z.number().int().nonnegative(),
  mimetype: z.string().max(256).optional(),
});
const MoodleUploadResponseSchema = z.array(MoodleUploadItemSchema).min(1).max(10);
const MoodleMutationResponseSchema = z.object({
  status: z.boolean().optional().default(true),
  warnings: z.array(z.unknown()).optional().default([]),
});

type ExecutionInput = Readonly<{
  assignmentId: MoodleAssignmentId;
  client: MoodleClient;
  payload: SubmissionPayload;
  session: MoodleSession;
  submissionDrafts: boolean;
}>;

export type SubmissionExecutionResult = Readonly<{
  state: "draft" | "submitted";
}>;

async function postUpload(
  session: MoodleSession,
  file: File,
  itemId: number,
): Promise<number> {
  const form = new FormData();
  form.set("token", session.token);
  form.set("itemid", String(itemId));
  form.set("filearea", "draft");
  form.set("filepath", "/");
  form.set("file", file, file.name);
  let response: Response;
  try {
    response = await ky.post(
      uploadEndpoint({
        baseUrl: session.site.siteUrl,
        service: session.service,
        timeoutMs: 10_000,
      }),
      {
        body: form,
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
        retry: { limit: 0 },
        throwHttpErrors: false,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new MoodleOutageError();
    }
    throw error;
  }
  const raw = await readMoodleJson(response);
  const parsed = MoodleUploadResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MoodleResponseError();
  }
  const first = parsed.data[0];
  if (first === undefined) {
    throw new MoodleResponseError();
  }
  return first.itemid;
}

async function uploadFiles(
  session: MoodleSession,
  files: readonly File[],
): Promise<number | null> {
  let itemId = 0;
  for (const file of files) {
    itemId = await postUpload(session, file, itemId);
  }
  return files.length === 0 ? null : itemId;
}

function saveParams(
  input: ExecutionInput,
  itemId: number | null,
): MoodleParams {
  return {
    assignmentid: input.assignmentId,
    ...(input.payload.onlineText === ""
      ? {}
      : {
          "plugindata[onlinetext_editor][text]": input.payload.onlineText,
          "plugindata[onlinetext_editor][format]": input.payload.onlineTextFormat,
          "plugindata[onlinetext_editor][itemid]": 0,
        }),
    ...(itemId === null ? {} : { "plugindata[files_filemanager]": itemId }),
  };
}

function assertMutationSucceeded(value: unknown): void {
  const parsed = MoodleMutationResponseSchema.safeParse(value);
  if (!parsed.success || !parsed.data.status) {
    throw new MoodleResponseError();
  }
}

export async function executeAssignmentSubmission(
  input: ExecutionInput,
): Promise<SubmissionExecutionResult> {
  const itemId = await uploadFiles(input.session, input.payload.newFiles);
  const save = await input.client.call(
    MOODLE_FUNCTIONS.saveAssignment,
    saveParams(input, itemId),
    MoodleMutationResponseSchema,
  );
  assertMutationSucceeded(save.data);
  if (input.payload.intent === "finalize") {
    const submitted = await input.client.call(
      MOODLE_FUNCTIONS.submitAssignment,
      {
        assignmentid: input.assignmentId,
        acceptsubmissionstatement: input.payload.acceptSubmissionStatement,
      },
      MoodleMutationResponseSchema,
    );
    assertMutationSucceeded(submitted.data);
    return { state: "submitted" };
  }
  return { state: input.submissionDrafts ? "draft" : "submitted" };
}
