import type { Metadata } from "next";

import { PdfWorkbench } from "@/components/pdf-tools/pdf-workbench";

export const metadata: Metadata = { title: "PDFツール" };

export default function PdfToolsPage() {
  return (
    <div className="ui-page-stack">
      <header className="ui-page-header">
        <h1>PDFツール</h1>
        <p>提出前の画像をPDFへまとめ、結合・並べ替え・回転・抽出できます。</p>
      </header>
      <PdfWorkbench />
    </div>
  );
}
