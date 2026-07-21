"use client";

import {
  ArrowDown,
  ArrowUp,
  FileArrowUp,
  FileText,
  Trash,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import type { AssignmentFile } from "@/lib/moodle/queries/assignments";
import { numberFormatter } from "@/lib/date-time";

type SubmissionFileQueueProps = Readonly<{
  accept: string;
  disabled: boolean;
  existingFiles: readonly AssignmentFile[];
  keptKeys: ReadonlySet<string>;
  locale: string;
  maxFileBytes: number;
  maxFiles: number;
  newFiles: readonly File[];
  onAdd: (files: readonly File[]) => void;
  onImagesToPdf: (files: readonly File[]) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemoveExisting: (key: string) => void;
  onRemoveNew: (index: number) => void;
}>;

function fileSize(bytes: number, locale: string): string {
  return numberFormatter(locale, { maximumFractionDigits: 1 }).format(bytes / 1_048_576) + " MB";
}

export function SubmissionFileQueue(props: SubmissionFileQueueProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeExisting = props.existingFiles.filter((file) => props.keptKeys.has(file.key));
  const totalBytes = activeExisting.reduce((sum, file) => sum + file.filesize, 0)
    + props.newFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className="ui-file-queue" aria-labelledby="submission-files-title">
      <div className="ui-file-queue__heading">
        <div><h3 id="submission-files-title">提出ファイル</h3><p>{activeExisting.length + props.newFiles.length}/{props.maxFiles}件 · {fileSize(totalBytes, props.locale)}</p></div>
        <div className="ui-file-queue__heading-actions">
          <button disabled={props.disabled} onClick={() => imageInputRef.current?.click()} type="button">画像をPDF化</button>
          <button disabled={props.disabled} onClick={() => inputRef.current?.click()} type="button">
            <FileArrowUp aria-hidden size={18} weight="regular" /> ファイルを選択
          </button>
        </div>
      </div>
      <button
        className="ui-dropzone"
        data-dragging={dragging}
        disabled={props.disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault(); setDragging(false); props.onAdd([...event.dataTransfer.files]);
        }}
        type="button"
      >
        <FileArrowUp aria-hidden size={25} weight="regular" />
        <span>ここへドラッグ&ドロップ</span>
        <small>1ファイル最大{fileSize(props.maxFileBytes, props.locale)}</small>
      </button>
      <input
        accept={props.accept || undefined}
        aria-label="提出ファイルを選択"
        className="ui-sr-only"
        data-testid="submission-file-input"
        disabled={props.disabled}
        multiple
        onChange={(event) => {
          props.onAdd([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-label="PDFに変換する画像を選択"
        className="ui-sr-only"
        data-testid="submission-image-input"
        disabled={props.disabled}
        multiple
        onChange={(event) => {
          props.onImagesToPdf([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={imageInputRef}
        type="file"
      />
      {props.existingFiles.length + props.newFiles.length === 0 ? (
        <p className="ui-file-queue__empty">まだファイルはありません。</p>
      ) : (
        <ol className="ui-file-queue__list">
          {props.existingFiles.map((file) => {
            const kept = props.keptKeys.has(file.key);
            return (
              <li data-removed={!kept} key={file.key}>
                <FileText aria-hidden size={20} weight="regular" />
                <span><strong>{file.filename}</strong><small>保存済み · {fileSize(file.filesize, props.locale)}</small></span>
                <button aria-label={`${file.filename}を${kept ? "除外" : "復元"}`} onClick={() => props.onRemoveExisting(file.key)} type="button">
                  {kept ? <Trash aria-hidden size={18} weight="regular" /> : "復元"}
                </button>
              </li>
            );
          })}
          {props.newFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${file.type}`}>
              <FileText aria-hidden size={20} weight="regular" />
              <span><strong>{file.name}</strong><small>新規 · {fileSize(file.size, props.locale)}</small></span>
              <div className="ui-file-queue__actions">
                <button aria-label={`${file.name}を上へ`} disabled={index === 0} onClick={() => props.onMove(index, -1)} type="button"><ArrowUp aria-hidden size={17} /></button>
                <button aria-label={`${file.name}を下へ`} disabled={index === props.newFiles.length - 1} onClick={() => props.onMove(index, 1)} type="button"><ArrowDown aria-hidden size={17} /></button>
                <button aria-label={`${file.name}を削除`} onClick={() => props.onRemoveNew(index)} type="button"><Trash aria-hidden size={17} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
