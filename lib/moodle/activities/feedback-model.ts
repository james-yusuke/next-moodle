import { z } from "zod";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

export const FeedbackItemWireSchema = z.object({
  hasvalue: MoodleBooleanSchema.optional().default(false),
  id: z.number().int().positive(),
  name: z.string().max(16_384),
  presentation: z.string().max(100_000).optional().default(""),
  required: MoodleBooleanSchema.optional().default(false),
  typ: z.string().min(1).max(80),
});

export type FeedbackItemWire = Readonly<z.input<typeof FeedbackItemWireSchema>>;

export type FeedbackItem = Readonly<{
  id: number;
  kind: "display" | "multiple" | "number" | "single" | "text" | "textarea" | "unsupported";
  name: string;
  options: readonly string[];
  required: boolean;
  responseName: string;
}>;

function choicePresentation(value: string): Readonly<{
  multiple: boolean;
  options: readonly string[];
}> {
  const separator = value.indexOf(">>>>>");
  const mode = separator === -1 ? "r" : value.slice(0, separator);
  const choices = separator === -1 ? value : value.slice(separator + 5);
  return {
    multiple: mode.includes("c"),
    options: choices.split("|").map((option) => option.trim()).filter(Boolean).slice(0, 50),
  };
}

export function projectFeedbackItems(input: readonly FeedbackItemWire[]): readonly FeedbackItem[] {
  return input.map((raw) => {
    const item = FeedbackItemWireSchema.parse(raw);
    const choice = item.typ.startsWith("multichoice")
      ? choicePresentation(item.presentation)
      : { multiple: false, options: [] };
    const kind: FeedbackItem["kind"] = !item.hasvalue
      ? "display"
      : item.typ === "textfield" ? "text"
      : item.typ === "textarea" ? "textarea"
      : item.typ === "numeric" ? "number"
      : item.typ.startsWith("multichoice") ? choice.multiple ? "multiple" : "single"
      : item.typ === "info" ? "display"
      : "unsupported";
    return {
      id: item.id,
      kind,
      name: item.name,
      options: choice.options,
      required: item.required,
      responseName: `${item.typ}_${item.id}`,
    };
  });
}

export type FeedbackActivityData = Readonly<{
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  id: number;
  items: readonly FeedbackItem[];
  name: string;
  page: number | null;
}>;
