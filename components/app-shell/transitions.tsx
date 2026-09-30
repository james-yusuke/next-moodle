import styles from "./transitions.module.css";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  motionIntentToTransitionTypes,
  sharedTransitionName,
} from "./motion";
import type { MotionIntent, SharedTransitionKind } from "./motion";
import { classNames } from "@/components/ui/class-names";

const ROUTE_TRANSITION_CLASSES = {
  default: "none",
  "drill-in": "workspace-drill-in",
  return: "workspace-return",
  switch: "workspace-switch",
} as const;

type NavigationMotionIntent = Exclude<MotionIntent, "reveal">;

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "transitionTypes"> & Readonly<{
  appearance?: "action";
  intent: NavigationMotionIntent;
}>;

export function TransitionLink({ appearance, intent, ...props }: TransitionLinkProps) {
  return (
    <Link
      {...props}
      className={classNames(
        props.className,
        appearance === "action" && styles.style1!,
      )}
      transitionTypes={motionIntentToTransitionTypes(intent)}
    />
  );
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
