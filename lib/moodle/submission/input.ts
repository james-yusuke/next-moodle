import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

import type { NativeSubmissionPolicy } from "../queries/assignment-policy";

export const MAX_SUBMISSION_BYTES = 12 * 1_024 * 1_024;
const HeaderLengthSchema = z.string().regex(/^\d{1,12}$/).transform(Number);
const TextValueSchema = z.string().max(200_000);
const IntentSchema = z.enum(["save", "finalize"]);
const OnlineTextFormatSchema = z.enum(["0", "1", "2", "4"]).transform(Number);
const ExistingFileKeySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const SAFE_FILE_TYPES: Readonly<Record<string, ReadonlySet<string>>> = {
  "application/msword": new Set([".doc"]),
  "application/pdf": new Set([".pdf"]),
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": new Set([".pptx"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": new Set([".xlsx"]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": new Set([".docx"]),
  "application/vnd.ms-excel": new Set([".xls"]),
  "application/vnd.ms-powerpoint": new Set([".ppt"]),
  "image/gif": new Set([".gif"]),
  "image/jpeg": new Set([".jpeg", ".jpg"]),
  "image/png": new Set([".png"]),
  "image/webp": new Set([".webp"]),
  "text/csv": new Set([".csv"]),
  "text/markdown": new Set([".md"]),
  "text/plain": new Set([".txt"]),
};

export type SubmissionInputErrorCode =
  | "invalid_multipart"
  | "request_too_large"
  | "invalid_submission"
  | "online_text_too_large"
  | "file_count_exceeded"
  | "file_too_large"
  | "unsupported_file_type"
  | "file_signature_mismatch"
  | "existing_file_unavailable"
  | "moodle_file_type_rejected";

export class SubmissionInputError extends Error {
  override readonly name = "SubmissionInputError";

  constructor(readonly code: SubmissionInputErrorCode) {
    super("The assignment submission is invalid.");
  }
}

export type SubmissionPayload = Readonly<{
  intent: "save" | "finalize";
  keptExistingFileKeys: readonly string[];
  newFiles: readonly File[];
  onlineText: string;
  onlineTextFormat: number;
}>;

type EnabledPolicy = Extract<NativeSubmissionPolicy, { readonly kind: "enabled" }>;

export function assertSubmissionRequestEnvelope(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;") || !contentType.includes("boundary=")) {
    throw new SubmissionInputError("invalid_multipart");
  }
  const length = request.headers.get("content-length");
  if (length === null) return;
  const parsed = HeaderLengthSchema.safeParse(length);
  if (!parsed.success) throw new SubmissionInputError("invalid_multipart");
  if (parsed.data > MAX_SUBMISSION_BYTES) {
    throw new SubmissionInputError("request_too_large");
  }
}

function extensionFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot).toLowerCase();
}

function mimeTypeFor(file: File): string {
  return file.type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function matchesMoodleType(file: File, accepted: readonly string[]): boolean {
  if (accepted.length === 0 || accepted.includes("*")) return true;
  const extension = extensionFor(file.name);
  const mime = mimeTypeFor(file);
  return accepted.some((entry) => {
    const value = entry.toLowerCase();
    if (value.startsWith(".")) return value === extension;
    if (value.endsWith("/*")) return mime.startsWith(value.slice(0, -1));
    if (value === "document") {
      return mime.startsWith("text/") || mime.includes("document") || mime === "application/pdf";
    }
    if (value === "image") return mime.startsWith("image/");
    return value === mime;
  });
}

async function hasValidSignature(file: File): Promise<boolean> {
  const mime = mimeTypeFor(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (mime.startsWith("text/")) {
    return !bytes.includes(0);
  }
  const detected = await fileTypeFromBuffer(bytes);
  if (detected === undefined) return false;
  if (detected.mime === mime) return true;
  if (mime.includes("openxmlformats") && detected.mime === "application/zip") return true;
  if (["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"].includes(mime)) {
    return detected.mime === "application/x-cfb";
  }
  return false;
}

type FormValues = Readonly<{
  intent: "save" | "finalize";
  keptExistingFileKeys: readonly string[];
  newFiles: readonly File[];
  onlineText: string;
  onlineTextFormat: number;
}>;

function formValues(form: FormData): FormValues {
  const allowed = new Set(["intent", "keptExistingFileKeys", "newFiles", "onlineText", "onlineTextFormat"]);
  for (const key of form.keys()) {
    if (!allowed.has(key)) throw new SubmissionInputError("invalid_submission");
  }
  const onlineText = form.get("onlineText");
  const onlineTextFormat = form.get("onlineTextFormat");
  const intent = form.get("intent");
  if (typeof onlineText !== "string" || typeof onlineTextFormat !== "string" || typeof intent !== "string") {
    throw new SubmissionInputError("invalid_submission");
  }
  const text = TextValueSchema.safeParse(onlineText);
  const format = OnlineTextFormatSchema.safeParse(onlineTextFormat);
  const parsedIntent = IntentSchema.safeParse(intent);
  const keys = z.array(ExistingFileKeySchema).max(100).safeParse(form.getAll("keptExistingFileKeys"));
  const rawFiles = form.getAll("newFiles");
  const newFiles = rawFiles.filter((value): value is File => value instanceof File)
    .filter((file) => file.name !== "" || file.size > 0);
  if (!text.success || !format.success || !parsedIntent.success || !keys.success || newFiles.length !== rawFiles.length) {
    throw new SubmissionInputError("invalid_submission");
  }
  return {
    intent: parsedIntent.data,
    keptExistingFileKeys: keys.data,
    newFiles,
    onlineText: text.data,
    onlineTextFormat: format.data,
  };
}

function assertMode(values: FormValues, policy: EnabledPolicy): void {
  const hasText = values.onlineText.trim() !== "";
  const hasFiles = values.newFiles.length + values.keptExistingFileKeys.length > 0;
  if (
    (policy.mode === "online_text" && (!hasText || hasFiles)) ||
    (policy.mode === "files" && (hasText || !hasFiles)) ||
    (policy.mode === "mixed" && !hasText && !hasFiles) ||
    (values.intent === "finalize" && !policy.supportsFinalize)
  ) {
    throw new SubmissionInputError("invalid_submission");
  }
}

export async function validateSubmissionFiles(
  files: readonly File[],
  policy: EnabledPolicy,
  textBytes = 0,
): Promise<void> {
  if (files.length > policy.limits.maxFiles) throw new SubmissionInputError("file_count_exceeded");
  for (const file of files) {
    if (file.size === 0 || file.size > policy.limits.maxFileBytes) {
      throw new SubmissionInputError("file_too_large");
    }
    const extensions = SAFE_FILE_TYPES[mimeTypeFor(file)];
    if (extensions?.has(extensionFor(file.name)) !== true) {
      throw new SubmissionInputError("unsupported_file_type");
    }
    if (!(await hasValidSignature(file))) {
      throw new SubmissionInputError("file_signature_mismatch");
    }
    if (!matchesMoodleType(file, policy.limits.acceptedFileTypes)) {
      throw new SubmissionInputError("moodle_file_type_rejected");
    }
  }
  if (files.reduce((total, file) => total + file.size, textBytes) > MAX_SUBMISSION_BYTES) {
    throw new SubmissionInputError("request_too_large");
  }
}

export async function parseSubmissionFormData(
  form: FormData,
  policy: EnabledPolicy,
): Promise<SubmissionPayload> {
  const values = formValues(form);
  assertMode(values, policy);
  const textBytes = new TextEncoder().encode(values.onlineText).byteLength;
  if (textBytes > policy.limits.maxOnlineTextBytes) {
    throw new SubmissionInputError("online_text_too_large");
  }
  if (values.newFiles.length + values.keptExistingFileKeys.length > policy.limits.maxFiles) {
    throw new SubmissionInputError("file_count_exceeded");
  }
  await validateSubmissionFiles(values.newFiles, policy, textBytes);
  return values;
}
