import type { Metadata } from "next";

import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { PdfWorkbench } from "@/components/pdf-tools/pdf-workbench";

export const metadata: Metadata = { title: "PDFツール" };

export default function PdfToolsPage() {
  return (
    <PageFrame content={<PdfWorkbench />} header={<RouteHeader description="画像のPDF化、結合、並べ替え、回転、抽出を端末内だけで処理します。" eyebrow="端末内ツール" title="PDFツール" />} mode="focus" />
  );
}
