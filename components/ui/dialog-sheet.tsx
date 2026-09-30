"use client";

import styles from "./dialog-sheet.module.css";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { IconButton } from "./icon-button";
import { classNames } from "./class-names";

type DialogSheetProps = Readonly<{
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placement?: "center" | "right" | "bottom";
  title: ReactNode;
}>;

const placementClasses = {
  center: styles.placementClassescenter1!,
  right: styles.placementClassesright2!,
  bottom: styles.placementClassesbottom3!,
} as const;

const placementMotion = {
  center: { initial: { opacity: 0, scale: 0.99, y: 6 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.99, y: 4 } },
  right: { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 16 } },
  bottom: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 } },
} as const;

export function DialogSheet({
  children,
  description,
  label,
  onOpenChange,
  open,
  placement = "right",
  title,
}: DialogSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(open);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    let frame: number | undefined;
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);

    if (open) {
      if (!dialog.open) dialog.showModal();
      frame = window.requestAnimationFrame(() => setVisible(true));
    } else {
      frame = window.requestAnimationFrame(() => setVisible(false));
      closeTimer.current = setTimeout(() => {
        if (dialog.open) dialog.close();
      }, reduceMotion ? 80 : 180);
    }

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    };
  }, [open, reduceMotion]);

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : placementMotion[placement];
  const duration = reduceMotion ? 0.08 : 0.18;

  return (
    <dialog
      aria-describedby={description === undefined ? undefined : descriptionId}
      aria-labelledby={titleId}
      className={classNames(
        styles.dialogSheet!,
        placement === "center" && styles.style1!,
        placement === "right" && styles.style2!,
        placement === "bottom" && styles.style3!,
        !open && styles.style4!,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) onOpenChange(false);
      }}
      ref={dialogRef}
    >
      <AnimatePresence>
        {visible ? (
          <m.div
            animate={{ opacity: 1 }}
            aria-hidden
            className={styles.style5!}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {visible ? (
          <m.section
            animate={panelMotion.animate}
            className={classNames(
              styles.style6!,
              placementClasses[placement],
            )}
            exit={panelMotion.exit}
            initial={panelMotion.initial}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className={styles.style7!}>
              <div className={styles.style8!}>
                <span className={styles.style9!}>{label}</span>
                <h2 className={styles.style10!} id={titleId}>{title}</h2>
                {description === undefined ? null : (
                  <p className={styles.style11!} id={descriptionId}>{description}</p>
                )}
              </div>
              <IconButton icon={<X size={20} />} label="閉じる" onClick={() => onOpenChange(false)} variant="ghost" />
            </header>
            <div className={styles.style12!}>{children}</div>
          </m.section>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
