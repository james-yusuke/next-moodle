"use client";

import { X } from "@phosphor-icons/react";
import { useId, useRef } from "react";
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

  function close(): void {
    dialogRef.current?.close();
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
