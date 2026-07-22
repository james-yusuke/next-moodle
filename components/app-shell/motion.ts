export const MOTION_INTENTS = ["drill-in", "return", "switch", "reveal"] as const;
export const WORKSPACE_MODES = ["overview", "browse", "focus", "conversation"] as const;

export type MotionIntent = (typeof MOTION_INTENTS)[number];
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export type SharedTransitionKind = "activity" | "conversation" | "course";

export function motionIntentToTransitionTypes(intent: MotionIntent): string[] {
  return intent === "reveal" ? [] : [intent];
}

export function sharedTransitionName(
  kind: SharedTransitionKind,
  identifier: string | number,
): string {
  const safeIdentifier = String(identifier)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${kind}-${safeIdentifier}`;
}
