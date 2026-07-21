"use client";

import {
  ArrowDown,
  ArrowUp,
  DownloadSimple,
  FilePdf,
  Plus,
  Selection,
  Trash,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button, Notice } from "@/components/ui";
import {
  PdfToolError,
  composePdf,
  initialPagePlan,
  preparePdfSources,
  type PdfPagePlan,
  type PdfSource,
} from "@/lib/pdf/operations";
import { PdfThumbnail } from "./pdf-thumbnail";
import "./pdf-tools.css";

const ERROR_COPY = {
  broken_pdf: "PDFが破損しているため読み込めません。元ファイルを書き出し直してください。",
  encrypted_pdf: "暗号化されたPDFには対応していません。保護を解除したコピーを使用してください。",
  file_limit: "ファイルは1〜20件で選択してください。",
  memory_error: "端末のメモリが不足しました。ファイルやページを減らしてください。",
  page_limit: "処理できるのは合計150ページまでです。",
  size_limit: "合計容量が100MBを超えています。",
  unsupported_file: "PDF、JPEG、PNG、WebPだけを選択できます。",
} as const;

function download(bytes: Uint8Array, filename: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function PdfWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<readonly PdfSource[]>([]);
  const [pages, setPages] = useState<readonly PdfPagePlan[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [stripMetadata, setStripMetadata] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFiles = async (files: readonly File[]) => {
    setPending(true); setError(null);
    try {
      const prepared = await preparePdfSources(files);
      const plan = initialPagePlan(prepared);
      setSources(prepared); setPages(plan); setSelected(new Set(plan.map((page) => page.id)));
    } catch (cause) {
      setError(cause instanceof PdfToolError ? ERROR_COPY[cause.code] : ERROR_COPY.memory_error);
    } finally {
      setPending(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => setPages((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    const item = next[index]; const replacement = next[target];
    if (item === undefined || replacement === undefined) return current;
    next[index] = replacement; next[target] = item; return next;
  });
  const rotate = (id: string) => setPages((current) => current.map((page) => page.id === id
    ? { ...page, rotation: ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
    : page));
  const remove = (id: string) => {
    setPages((current) => current.filter((page) => page.id !== id));
    setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
  };
  const exportPdf = async (onlySelected: boolean) => {
    const outputPages = onlySelected ? pages.filter((page) => selected.has(page.id)) : pages;
    setPending(true); setError(null);
    try {
      download(await composePdf(sources, outputPages, stripMetadata), onlySelected ? "extracted-pages.pdf" : "combined.pdf");
    } catch (cause) {
      setError(cause instanceof PdfToolError ? ERROR_COPY[cause.code] : ERROR_COPY.memory_error);
    } finally { setPending(false); }
  };
  const clear = () => { setSources([]); setPages([]); setSelected(new Set()); setError(null); };

  return (
    <div className="ui-pdf-workbench">
      <section className="ui-pdf-import">
        <div><FilePdf aria-hidden size={32} weight="regular" /><h2>端末内だけで処理</h2><p>ファイルはNext.jsにもMoodleにも送信されません。</p></div>
        <Button icon={<Plus aria-hidden size={18} />} loading={pending} onClick={() => inputRef.current?.click()} type="button" variant="primary">ファイルを追加</Button>
        <input accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="PDFツールへファイルを追加" className="ui-sr-only" multiple onChange={(event) => { void importFiles([...(event.currentTarget.files ?? [])]); event.currentTarget.value = ""; }} ref={inputRef} type="file" />
        <small>最大20ファイル · 100MB · 150ページ</small>
      </section>
      {error === null ? null : <Notice title="処理できませんでした" tone="error"><p>{error}</p></Notice>}
      {pages.length === 0 ? (
        <div className="ui-pdf-empty"><FilePdf aria-hidden size={42} weight="regular" /><h2>PDFか画像を選択</h2><p>結合、並べ替え、回転、ページ抽出、画像のPDF化ができます。</p></div>
      ) : (
        <>
          <div className="ui-pdf-toolbar">
            <label><input checked={stripMetadata} onChange={(event) => setStripMetadata(event.currentTarget.checked)} type="checkbox" /> 標準メタデータを削除</label>
            <span>{pages.length}ページ</span>
            <Button onClick={clear} type="button" variant="ghost">キャンセル</Button>
          </div>
          <ol className="ui-pdf-pages">
            {pages.map((page, index) => {
              const source = sources[page.sourceIndex];
              if (source === undefined) return null;
              return (
                <li key={page.id}>
                  <label className="ui-pdf-select"><input checked={selected.has(page.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(page.id)) next.delete(page.id); else next.add(page.id); return next; })} type="checkbox" /><span className="ui-sr-only">ページを選択</span></label>
                  <div className="ui-pdf-preview" style={{ rotate: `${page.rotation}deg` }}><PdfThumbnail bytes={source.bytes} pageIndex={page.pageIndex} /></div>
                  <div className="ui-pdf-page-copy"><strong>{source.name}</strong><span>{page.pageIndex + 1}ページ</span></div>
                  <div className="ui-pdf-page-actions">
                    <button aria-label="上へ" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp aria-hidden size={17} /></button>
                    <button aria-label="下へ" disabled={index === pages.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown aria-hidden size={17} /></button>
                    <button aria-label="90度回転" onClick={() => rotate(page.id)} type="button"><ArrowClockwise aria-hidden size={17} /></button>
                    <button aria-label="削除" onClick={() => remove(page.id)} type="button"><Trash aria-hidden size={17} /></button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="ui-pdf-export">
            <Button disabled={selected.size === 0 || pending} icon={<Selection aria-hidden size={18} />} onClick={() => void exportPdf(true)} type="button" variant="secondary">選択ページを抽出</Button>
            <Button disabled={pending} icon={<DownloadSimple aria-hidden size={18} />} onClick={() => void exportPdf(false)} type="button" variant="primary">PDFをダウンロード</Button>
          </div>
        </>
      )}
    </div>
  );
}
