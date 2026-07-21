import { MoodleInputError } from "./errors";
import type { MoodleToken } from "./identifiers";

export type MoodleParamPrimitive = string | number | boolean;
export type MoodleParams = Readonly<
  Record<string, MoodleParamPrimitive | readonly MoodleParamPrimitive[]>
>;

const RESERVED_KEYS: ReadonlySet<string> = new Set([
  "wstoken",
  "wsfunction",
  "moodlewsrestformat",
]);

function encodePrimitive(value: MoodleParamPrimitive): string {
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new MoodleInputError();
  }
  return String(value);
}

function isPrimitiveArray(
  value: MoodleParamPrimitive | readonly MoodleParamPrimitive[],
): value is readonly MoodleParamPrimitive[] {
  return Array.isArray(value);
}

export function encodeMoodleParams(
  token: MoodleToken,
  functionName: string,
  params: MoodleParams,
): URLSearchParams {
  const form = new URLSearchParams({
    wstoken: token,
    wsfunction: functionName,
    moodlewsrestformat: "json",
  });

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_KEYS.has(key) || !/^[a-z][a-z0-9_\[\]]*$/i.test(key)) {
      throw new MoodleInputError();
    }
    if (isPrimitiveArray(value)) {
      value.forEach((entry, index) => {
        form.append(`${key}[${index}]`, encodePrimitive(entry));
      });
    } else {
      form.append(key, encodePrimitive(value));
    }
  }
  return form;
}
