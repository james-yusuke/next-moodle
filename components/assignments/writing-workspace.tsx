"use client";

import dynamic from "next/dynamic";
import { Sparkle } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";

import type { AiAvailability } from "@/lib/ai/config";
import type { AiTextFormat } from "@/lib/ai/contracts";
import { AiAssistPanel } from "./ai-assist-panel";
import { completionStatusCopy } from "./ai-client";
import { PlainWritingEditor } from "./plain-writing-editor";
import { useAiCompletion } from "./use-ai-completion";
import { useAiConsent } from "./use-ai-consent";
import type { WritingCursorContext, WritingEditorHandle } from "./writing-editor-types";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((module) => module.RichTextEditor),
  { ssr: false },
);

type WritingWorkspaceProps = Readonly<{
  aiAvailability: AiAvailability;
  aiConsentStorageKey: string;
  cmid: number;
  disabled: boolean;
  format: AiTextFormat;
  maxLength: number;
  onChange: (value: string) => void;
  submitting: boolean;
  value: string;
}>;

const EMPTY_CURSOR: WritingCursorContext = {
  afterCursor: "",
  beforeCursor: "",
  hasSelection: false,
  selectedText: "",
};

export function WritingWorkspace(props: WritingWorkspaceProps) {
  const editorRef = useRef<WritingEditorHandle>(null);
  const [cursor, setCursor] = useState<WritingCursorContext>(EMPTY_CURSOR);
  const [composing, setComposing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const consent = useAiConsent(props.aiConsentStorageKey);
  const completion = useAiCompletion({
    afterCursor: cursor.afterCursor,
    beforeCursor: cursor.beforeCursor,
    cmid: props.cmid,
    consented: consent.state === "granted",
    enabled: props.aiAvailability.enabled,
    format: props.format,
    hasSelection: cursor.hasSelection,
    isComposing: composing,
    submitting: props.submitting,
  });
  const excerpt = useMemo(() => {
    if (cursor.selectedText.trim() !== "") return cursor.selectedText.slice(0, 6_000);
    return `${cursor.beforeCursor}${cursor.afterCursor}`.slice(-6_000);
  }, [cursor]);

  const changed = (value: string) => {
    setCanUndo(false);
    props.onChange(value);
  };
  const accepted = () => {
    setCanUndo(true);
    completion.clear();
  };
  const insert = (value: string) => {
    if (editorRef.current?.insertText(value) === true) setCanUndo(true);
  };
  const undo = () => {
    if (editorRef.current?.undo() === true) setCanUndo(false);
  };

  const editorProps = {
    candidate: completion.candidate,
    disabled: props.disabled,
    onAcceptCandidate: accepted,
    onChange: changed,
    onComposingChange: setComposing,
    onCursorContext: setCursor,
    onDiscardCandidate: completion.clear,
  } as const;
  const completionStatus = completion.status === "waiting"
    ? "候補を確認中"
    : completion.candidate !== ""
      ? "Tabで候補を挿入、Escで破棄"
      : completionStatusCopy(completion.errorCode);

  return (
    <div className="ui-writing-workspace">
      <div className="ui-writing-workspace__editor">
        {props.format === 1 ? (
          <RichTextEditor {...editorProps} initialContent={props.value} ref={editorRef} />
        ) : (
          <PlainWritingEditor {...editorProps} maxLength={props.maxLength} ref={editorRef} value={props.value} />
        )}
        <div
          aria-live="polite"
          className="ui-ai-completion-status"
          data-error={completion.status === "error"}
        >
          {completionStatus}
        </div>
      </div>
      <details className="ui-writing-utility">
        <summary><Sparkle aria-hidden size={18} />文章補助を開く<span>任意</span></summary>
        <AiAssistPanel
          availability={props.aiAvailability}
          canUndo={canUndo}
          cmid={props.cmid}
          consentState={consent.state}
          excerpt={excerpt}
          format={props.format}
          onGrant={consent.grant}
          onInsert={insert}
          onRevoke={() => {
            completion.clear();
            consent.revoke();
          }}
          onUndo={undo}
          submitting={props.submitting}
        />
      </details>
    </div>
  );
}
