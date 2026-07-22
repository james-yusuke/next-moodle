import Link from "next/link";
import { ViewTransition } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  motionIntentToTransitionTypes,
  sharedTransitionName,
} from "./motion";
import type { MotionIntent, SharedTransitionKind } from "./motion";

const ROUTE_TRANSITION_CLASSES = {
  default: "none",
  "drill-in": "workspace-drill-in",
  return: "workspace-return",
  switch: "workspace-switch",
} as const;

type NavigationMotionIntent = Exclude<MotionIntent, "reveal">;

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "transitionTypes"> & Readonly<{
  intent: NavigationMotionIntent;
}>;

export function TransitionLink({ intent, ...props }: TransitionLinkProps) {
  return <Link {...props} transitionTypes={motionIntentToTransitionTypes(intent)} />;
}

export function WorkspaceTransition({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition
      default="none"
      enter={ROUTE_TRANSITION_CLASSES}
      exit={ROUTE_TRANSITION_CLASSES}
    >
      {children}
    </ViewTransition>
  );
}

export function RevealTransition({ children }: Readonly<{ children: ReactNode }>) {
  return <ViewTransition default="none" enter="workspace-reveal">{children}</ViewTransition>;
}

export function SharedTransition({
  children,
  identifier,
  kind,
}: Readonly<{
  children: ReactNode;
  identifier: string | number;
  kind: SharedTransitionKind;
}>) {
  return (
    <ViewTransition
      name={sharedTransitionName(kind, identifier)}
      share="workspace-shared"
    >
      {children}
    </ViewTransition>
  );
}
