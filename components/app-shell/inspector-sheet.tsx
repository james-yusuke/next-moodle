"use client";

import { X } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import type { AnimationEvent } from "react";
import type { ReactNode } from "react";

type InspectorSheetProps = Readonly<{
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  title: ReactNode;
}>;

export function InspectorSheet({ children, description, label, title }: InspectorSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);

  function close(): void {
    setClosing(true);
  }

  function finishClose(event: AnimationEvent<HTMLDialogElement>): void {
    if (closing && event.currentTarget === event.target) {
      dialogRef.current?.close();
      setClosing(false);
    }
  }

  return (
    <>
      <button
        className="ui-inspector-sheet__trigger"
        onClick={() => dialogRef.current?.showModal()}
        ref={triggerRef}
        type="button"
      >
        {label}
      </button>
      <dialog
        aria-labelledby={titleId}
        className="ui-inspector-sheet"
        data-closing={closing}
        onAnimationEnd={finishClose}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => triggerRef.current?.focus()}
        ref={dialogRef}
      >
        <div className="ui-inspector-sheet__panel">
          <header>
            <div>
              <h2 id={titleId}>{title}</h2>
              {description === undefined ? null : <p>{description}</p>}
            </div>
            <button aria-label="詳細を閉じる" onClick={close} type="button">
              <X aria-hidden size={20} weight="regular" />
            </button>
          </header>
          <div className="ui-inspector-sheet__body">{children}</div>
        </div>
      </dialog>
    </>
  );
}
