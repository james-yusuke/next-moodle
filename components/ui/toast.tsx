"use client";

import styles from "./toast.module.css";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { CheckCircle, Info, Warning, XCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

export type ToastTone = "info" | "success" | "warning" | "error";

type ToastProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  id: string;
  tone?: ToastTone;
  visible?: boolean;
}>;

const toneClasses: Record<ToastTone, string> = {
  info: styles.toneClassesinfo1!,
  success: styles.toneClassessuccess2!,
  warning: styles.toneClasseswarning3!,
  error: styles.toneClasseserror4!,
};

function ToastIcon({ tone }: Readonly<{ tone: ToastTone }>) {
  if (tone === "success") return <CheckCircle aria-hidden size={20} />;
  if (tone === "warning") return <Warning aria-hidden size={20} />;
  if (tone === "error") return <XCircle aria-hidden size={20} />;
  return <Info aria-hidden size={20} />;
}

export function Toast({ action, children, id, tone = "info", visible = true }: ToastProps) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className={styles.toast!}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          key={id}
          role={tone === "error" ? "alert" : "status"}
          transition={{ duration: reduceMotion ? 0.08 : 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={classNames(styles.style1!, toneClasses[tone])}><ToastIcon tone={tone} /></span>
          <div className={styles.style2!}>{children}</div>
          {action}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ToastRegion({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      aria-label="通知"
      aria-live="polite"
      className={styles.style3!}
    >
      {children}
    </div>
  );
}
