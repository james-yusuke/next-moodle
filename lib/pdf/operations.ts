import { PDFDocument, degrees } from "pdf-lib";

export const PDF_LIMITS = { files: 20, pages: 150, totalBytes: 100 * 1_024 * 1_024 } as const;

export type PdfSource = Readonly<{
  bytes: Uint8Array;
  name: string;
  pageCount: number;
}>;

export type PdfPagePlan = Readonly<{
  id: string;
  pageIndex: number;
  rotation: 0 | 90 | 180 | 270;
  sourceIndex: number;
}>;

export type PdfToolErrorCode =
  | "encrypted_pdf"
  | "file_limit"
  | "memory_error"
  | "page_limit"
  | "broken_pdf"
  | "size_limit"
  | "unsupported_file";

export class PdfToolError extends Error {
  override readonly name = "PdfToolError";
  constructor(readonly code: PdfToolErrorCode) {
    super("The PDF operation could not be completed.");
  }
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

function supportedKind(file: File): "jpeg" | "pdf" | "png" | "webp" {
  const ext = extension(file.name);
  if (file.type === "application/pdf" && ext === ".pdf") return "pdf";
  if (file.type === "image/jpeg" && [".jpg", ".jpeg"].includes(ext)) return "jpeg";
  if (file.type === "image/png" && ext === ".png") return "png";
  if (file.type === "image/webp" && ext === ".webp") return "webp";
  throw new PdfToolError("unsupported_file");
}

async function webpToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new PdfToolError("memory_error");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) throw new PdfToolError("memory_error");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

async function imageToPdf(file: File, kind: "jpeg" | "png" | "webp"): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const bytes = kind === "webp"
    ? await webpToPng(file)
    : new Uint8Array(await file.arrayBuffer());
  const image = kind === "jpeg" ? await document.embedJpg(bytes) : await document.embedPng(bytes);
  const scale = Math.min(1, 14_400 / Math.max(image.width, image.height));
  const width = Math.max(1, image.width * scale);
  const height = Math.max(1, image.height * scale);
  const page = document.addPage([width, height]);
  page.drawImage(image, { height, width, x: 0, y: 0 });
  return document.save();
}

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw new PdfToolError("encrypted_pdf");
    }
    if (error instanceof RangeError) throw new PdfToolError("memory_error");
    throw new PdfToolError("broken_pdf");
  }
}

export async function preparePdfSources(files: readonly File[]): Promise<readonly PdfSource[]> {
  if (files.length === 0 || files.length > PDF_LIMITS.files) throw new PdfToolError("file_limit");
  if (files.reduce((sum, file) => sum + file.size, 0) > PDF_LIMITS.totalBytes) {
    throw new PdfToolError("size_limit");
  }
  const sources: PdfSource[] = [];
  let pageCount = 0;
  for (const file of files) {
    const kind = supportedKind(file);
    const bytes = kind === "pdf"
      ? new Uint8Array(await file.arrayBuffer())
      : await imageToPdf(file, kind);
    const document = await loadPdf(bytes);
    pageCount += document.getPageCount();
    if (pageCount > PDF_LIMITS.pages) throw new PdfToolError("page_limit");
    sources.push({ bytes, name: file.name, pageCount: document.getPageCount() });
  }
  return sources;
}

export function initialPagePlan(sources: readonly PdfSource[]): readonly PdfPagePlan[] {
  return sources.flatMap((source, sourceIndex) =>
    Array.from({ length: source.pageCount }, (_, pageIndex) => ({
      id: `${sourceIndex}-${pageIndex}`,
      pageIndex,
      rotation: 0 as const,
      sourceIndex,
    })),
  );
}

export async function composePdf(
  sources: readonly PdfSource[],
  pages: readonly PdfPagePlan[],
  removeMetadata: boolean,
): Promise<Uint8Array> {
  if (pages.length === 0 || pages.length > PDF_LIMITS.pages) throw new PdfToolError("page_limit");
  try {
    const output = await PDFDocument.create();
    const loaded = await Promise.all(sources.map((source) => loadPdf(source.bytes)));
    for (const plan of pages) {
      const source = loaded[plan.sourceIndex];
      if (source === undefined || plan.pageIndex >= source.getPageCount()) {
        throw new PdfToolError("broken_pdf");
      }
      const [page] = await output.copyPages(source, [plan.pageIndex]);
      if (page === undefined) throw new PdfToolError("broken_pdf");
      page.setRotation(degrees(plan.rotation));
      output.addPage(page);
    }
    if (removeMetadata) delete output.context.trailerInfo.Info;
    return output.save();
  } catch (error) {
    if (error instanceof PdfToolError) throw error;
    if (error instanceof RangeError) throw new PdfToolError("memory_error");
    throw new PdfToolError("broken_pdf");
  }
}

export async function createPdfFromImages(files: readonly File[]): Promise<File> {
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw new PdfToolError("unsupported_file");
  }
  const sources = await preparePdfSources(files);
  const bytes = await composePdf(sources, initialPagePlan(sources), true);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], "images.pdf", { type: "application/pdf" });
}
