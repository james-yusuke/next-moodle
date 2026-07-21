import { MOODLE_FUNCTIONS } from "../functions";
import type {
  MoodleAssignmentWire,
  MoodleSubmissionStatus,
} from "./assignments.schemas";

const SUPPORTED_PLUGINS: ReadonlySet<string> = new Set(["file", "onlinetext"]);
const MAX_NATIVE_FILES = 5;
const MAX_NATIVE_FILE_BYTES = 10 * 1_024 * 1_024;

export type NativeSubmissionMode = "online_text" | "files" | "mixed";
export type NativeBlockReason =
  | "group_submission"
  | "submission_statement"
  | "unsupported_plugin"
  | "locked"
  | "graded"
  | "final_state"
  | "not_open"
  | "cutoff_reached"
  | "permission"
  | "capability";

export type NativeSubmissionLimits = Readonly<{
  acceptedFileTypes: readonly string[];
  maxFileBytes: number;
  maxFiles: number;
  maxOnlineTextBytes: number;
}>;

export type NativeSubmissionPolicy =
  | Readonly<{
      kind: "enabled";
      limits: NativeSubmissionLimits;
      mode: NativeSubmissionMode;
      supportsFinalize: boolean;
    }>
  | Readonly<{ kind: "fallback"; reason: NativeBlockReason }>;

type PolicyInput = Readonly<{
  assignment: MoodleAssignmentWire;
  availableFunctions: readonly string[];
  fileUpload: boolean;
  now: number;
  submission: MoodleSubmissionStatus;
}>;

function normalizedPlugin(value: string): string {
  return value.toLowerCase().replace(/^assignsubmission_/, "");
}

function enabledValue(value: string | number | boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return value === 1 || ["1", "true", "yes"].includes(String(value).toLowerCase());
}

function enabledPlugins(input: PolicyInput): readonly string[] {
  const configured = input.assignment.configs
    .filter(
      (config) =>
        config.subtype.toLowerCase() === "assignsubmission" &&
        config.name.toLowerCase() === "enabled" &&
        enabledValue(config.value),
    )
    .map((config) => normalizedPlugin(config.plugin));
  if (configured.length > 0) {
    return [...new Set(configured)];
  }
  const observed = (input.submission.lastattempt?.submission?.plugins ?? []).map(
    (plugin) => normalizedPlugin(plugin.type),
  );
  if (observed.length > 0) {
    return [...new Set(observed)];
  }
  return input.assignment.maxfilesubmissions > 0 ? ["file"] : [];
}

function configNumber(
  assignment: MoodleAssignmentWire,
  plugin: string,
  name: string,
): number | null {
  const config = assignment.configs.find(
    (candidate) =>
      normalizedPlugin(candidate.plugin) === plugin &&
      candidate.name.toLowerCase() === name,
  );
  if (config === undefined) {
    return null;
  }
  const value = Number(config.value);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function fileTypes(assignment: MoodleAssignmentWire): readonly string[] {
  const config = assignment.configs.find(
    (candidate) =>
      normalizedPlugin(candidate.plugin) === "file" &&
      candidate.name.toLowerCase() === "filetypeslist",
  );
  if (config === undefined) {
    return [];
  }
  return String(config.value)
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value !== "");
}

function limitsFor(assignment: MoodleAssignmentWire): NativeSubmissionLimits {
  const configuredFiles = configNumber(assignment, "file", "maxfilesubmissions");
  const configuredBytes = configNumber(
    assignment,
    "file",
    "maxsubmissionsizebytes",
  );
  const moodleFiles = configuredFiles ?? assignment.maxfilesubmissions;
  const moodleBytes = configuredBytes ?? assignment.maxsubmissionsizebytes;
  return {
    acceptedFileTypes: fileTypes(assignment),
    maxFiles: Math.min(Math.max(moodleFiles, 1), MAX_NATIVE_FILES),
    maxFileBytes: Math.min(
      moodleBytes > 0 ? moodleBytes : MAX_NATIVE_FILE_BYTES,
      MAX_NATIVE_FILE_BYTES,
    ),
    maxOnlineTextBytes: 100_000,
  };
}

function modeFor(plugins: ReadonlySet<string>): NativeSubmissionMode | null {
  if (plugins.has("file") && plugins.has("onlinetext")) {
    return "mixed";
  }
  if (plugins.has("file")) {
    return "files";
  }
  if (plugins.has("onlinetext")) {
    return "online_text";
  }
  return null;
}

export function deriveNativeSubmissionPolicy(
  input: PolicyInput,
): NativeSubmissionPolicy {
  const lastAttempt = input.submission.lastattempt;
  const state = lastAttempt?.submission?.status.toLowerCase() ?? "new";
  const grading = lastAttempt?.gradingstatus.toLowerCase() ?? "notgraded";
  const functions = new Set(input.availableFunctions);
  const plugins = new Set(enabledPlugins(input));
  const mode = modeFor(plugins);

  if (input.assignment.teamsubmission) {
    return { kind: "fallback", reason: "group_submission" };
  }
  if (input.assignment.requiresubmissionstatement) {
    return { kind: "fallback", reason: "submission_statement" };
  }
  if ([...plugins].some((plugin) => !SUPPORTED_PLUGINS.has(plugin)) || mode === null) {
    return { kind: "fallback", reason: "unsupported_plugin" };
  }
  if (lastAttempt?.graded || grading === "graded") {
    return { kind: "fallback", reason: "graded" };
  }
  if (lastAttempt?.locked) {
    return { kind: "fallback", reason: "locked" };
  }
  if (!["new", "draft", "reopened"].includes(state)) {
    return { kind: "fallback", reason: "final_state" };
  }
  if (
    input.assignment.allowsubmissionsfromdate > 0 &&
    input.now < input.assignment.allowsubmissionsfromdate
  ) {
    return { kind: "fallback", reason: "not_open" };
  }
  if (input.assignment.cutoffdate > 0 && input.now > input.assignment.cutoffdate) {
    return { kind: "fallback", reason: "cutoff_reached" };
  }
  if (
    input.assignment.nosubmissions ||
    lastAttempt === undefined ||
    !lastAttempt.submissionsenabled ||
    !lastAttempt.canedit ||
    (input.assignment.submissiondrafts && !lastAttempt.cansubmit)
  ) {
    return { kind: "fallback", reason: "permission" };
  }
  if (
    !functions.has(MOODLE_FUNCTIONS.saveAssignment) ||
    (mode !== "online_text" && !input.fileUpload) ||
    (input.assignment.submissiondrafts &&
      !functions.has(MOODLE_FUNCTIONS.submitAssignment))
  ) {
    return { kind: "fallback", reason: "capability" };
  }
  return {
    kind: "enabled",
    limits: limitsFor(input.assignment),
    mode,
    supportsFinalize: input.assignment.submissiondrafts,
  };
}
