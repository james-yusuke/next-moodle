import type { NativeSubmissionPolicy } from "../queries/assignment-policy";
import type { AssignmentFile } from "../queries/assignments";
import type { MoodleSession } from "../site";
import { proxyMoodleFile } from "../../security/moodle-file-proxy";
import { SubmissionInputError } from "./input";

type EnabledPolicy = Extract<NativeSubmissionPolicy, { readonly kind: "enabled" }>;

function sourceUrl(downloadUrl: string): string {
  const url = new URL(downloadUrl, "https://app.invalid");
  const target = url.pathname === "/api/files" ? url.searchParams.get("url") : null;
  if (target === null) throw new SubmissionInputError("existing_file_unavailable");
  return target;
}

export async function restoreExistingFiles(input: Readonly<{
  files: readonly AssignmentFile[];
  keptKeys: readonly string[];
  policy: EnabledPolicy;
  session: MoodleSession;
}>): Promise<readonly File[]> {
  if (new Set(input.keptKeys).size !== input.keptKeys.length) {
    throw new SubmissionInputError("invalid_submission");
  }
  const byKey = new Map(input.files.map((file) => [file.key, file]));
  const selected = input.keptKeys.map((key) => {
    const file = byKey.get(key);
    if (file === undefined || file.downloadUrl === undefined) {
      throw new SubmissionInputError("existing_file_unavailable");
    }
    if (file.filesize > input.policy.limits.maxFileBytes) {
      throw new SubmissionInputError("file_too_large");
    }
    return file;
  });
  const restored: File[] = [];
  for (const file of selected) {
    if (file.downloadUrl === undefined) {
      throw new SubmissionInputError("existing_file_unavailable");
    }
    const response = await proxyMoodleFile(input.session, sourceUrl(file.downloadUrl));
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > input.policy.limits.maxFileBytes) {
      throw new SubmissionInputError("file_too_large");
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > input.policy.limits.maxFileBytes) {
      throw new SubmissionInputError("file_too_large");
    }
    restored.push(new File([bytes], file.filename, { type: file.mimetype }));
  }
  return restored;
}
