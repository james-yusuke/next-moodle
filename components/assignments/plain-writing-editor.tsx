"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

import { insertAtSelection } from "./ai-client";
import type { WritingCursorContext, WritingEditorHandle } from "./writing-editor-types";

type PlainWritingEditorProps = Readonly<{
  candidate: string;
  disabled: boolean;
  maxLength: number;
  onAcceptCandidate: () => void;
  onChange: (value: string) => void;
  onComposingChange: (value: boolean) => void;
  onCursorContext: (value: WritingCursorContext) => void;
  onDiscardCandidate: () => void;
  value: string;
}>;

export const PlainWritingEditor = forwardRef<WritingEditorHandle, PlainWritingEditorProps>(
function PlainWritingEditor(props, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const previousValueRef = useRef<string | null>(null);
  const selectionRef = useRef({ start: props.value.length, end: props.value.length });

  const reportSelection = () => {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    selectionRef.current = { start, end };
    props.onCursorContext({
      afterCursor: props.value.slice(end),
      beforeCursor: props.value.slice(0, start),
      hasSelection: start !== end,
      selectedText: props.value.slice(start, end),
    });
  };

  const focusAt = (position: number) => {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea === null) return;
      textarea.focus();
      textarea.setSelectionRange(position, position);
      reportSelection();
    });
  };

  const insertText = (suggestion: string): boolean => {
    const result = insertAtSelection({
      end: selectionRef.current.end,
      start: selectionRef.current.start,
      suggestion,
      value: props.value,
    });
    previousValueRef.current = result.previousValue;
    props.onChange(result.nextValue);
    focusAt(result.nextCursor);
    return true;
  };

  useImperativeHandle(ref, () => ({
    insertText,
    undo: () => {
      const previous = previousValueRef.current;
      if (previous === null) return false;
      previousValueRef.current = null;
      props.onChange(previous);
      focusAt(Math.min(selectionRef.current.start, previous.length));
      return true;
    },
  }));

  const acceptCandidate = () => {
    if (props.candidate === "" || !insertText(props.candidate)) return;
    props.onAcceptCandidate();
  };

  return (
    <div className="ui-plain-editor">
      <div aria-hidden className="ui-plain-editor__mirror" ref={mirrorRef}>
        <span>{props.value.slice(0, selectionRef.current.start)}</span>
        <mark>{props.candidate}</mark>
      </div>
      <textarea
        aria-label="本文"
        className="ui-plain-editor__input"
        disabled={props.disabled}
        maxLength={props.maxLength}
        onChange={(event) => {
          previousValueRef.current = null;
          props.onChange(event.currentTarget.value);
        }}
        onClick={reportSelection}
        onCompositionEnd={() => {
          props.onComposingChange(false);
          reportSelection();
        }}
        onCompositionStart={() => props.onComposingChange(true)}
        onKeyDown={(event) => {
          if (props.candidate === "") return;
          if (event.key === "Escape") {
            event.preventDefault();
            props.onDiscardCandidate();
            return;
          }
          if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            acceptCandidate();
          }
        }}
        onKeyUp={reportSelection}
        onScroll={(event) => {
          const mirror = mirrorRef.current;
          if (mirror === null) return;
          mirror.scrollTop = event.currentTarget.scrollTop;
          mirror.scrollLeft = event.currentTarget.scrollLeft;
        }}
        onSelect={reportSelection}
        ref={textareaRef}
        value={props.value}
      />
    </div>
  );
});
