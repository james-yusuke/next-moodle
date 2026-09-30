"use client";

import styles from "./popover-menu.module.css";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { classNames } from "./class-names";

type PopoverMenuProps = Readonly<{
  align?: "start" | "end";
  children: ReactNode;
  label: string;
  side?: "bottom" | "top";
  trigger: ReactElement<{ onClick?: () => void }>;
}>;

export function PopoverMenu({ align = "end", children, label, side = "bottom", trigger }: PopoverMenuProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const focusTrigger = () => rootRef.current?.querySelector<HTMLElement>("[aria-haspopup='menu']")?.focus();

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        focusTrigger();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        focusTrigger();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("[role='menuitem'], a, button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        "aria-expanded": open,
        "aria-haspopup": "menu",
        onClick: () => {
          trigger.props.onClick?.();
          setOpen((value) => !value);
        },
      } as never)
    : trigger;

  return (
    <div className={styles.popoverMenu!} ref={rootRef}>
      {triggerElement}
      <AnimatePresence>
        {open ? (
          <m.div
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            aria-label={label}
            className={classNames(
              styles.style1!,
              side === "top"
                ? align === "end" ? styles.style2! : styles.style3!
                : align === "end" ? styles.style4! : styles.style5!,
            )}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: -4 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: -4 }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a,button,[role='menuitem']")) setOpen(false);
            }}
            role="menu"
            ref={menuRef}
            transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
