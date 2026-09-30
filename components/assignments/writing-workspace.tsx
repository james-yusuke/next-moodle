"use client";

import styles from "./writing-workspace.module.css";
import dynamic from "next/dynamic";

import { PlainWritingEditor } from "./plain-writing-editor";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((module) => module.RichTextEditor),
  { ssr: false },
);

export type WritingTextFormat = 0 | 1 | 2 | 4;

type WritingWorkspaceProps = Readonly<{
  disabled: boolean;
  format: WritingTextFormat;
  maxLength: number;
  onChange: (value: string) => void;
  value: string;
}>;

export function WritingWorkspace(props: WritingWorkspaceProps) {
  return (
    <div className={styles.writingWorkspace!}>
      {props.format === 1 ? (
        <RichTextEditor disabled={props.disabled} initialContent={props.value} onChange={props.onChange} />
      ) : (
        <PlainWritingEditor disabled={props.disabled} maxLength={props.maxLength} onChange={props.onChange} value={props.value} />
      )}
    </div>
  );
}
