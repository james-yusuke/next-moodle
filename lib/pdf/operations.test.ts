import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";

import { composePdf, initialPagePlan, preparePdfSources } from "./operations";

async function sourcePdf(name: string, sizes: readonly [number, number][]) {
  const document = await PDFDocument.create();
  document.setAuthor("private author");
  for (const size of sizes) document.addPage(size);
  const bytes = await document.save();
  return { bytes, name, pageCount: sizes.length };
}

describe("client-only PDF operations", () => {
  test("merges, reorders, rotates, extracts, and removes metadata", async () => {
    const first = await sourcePdf("first.pdf", [[100, 200], [300, 400]]);
    const second = await sourcePdf("second.pdf", [[500, 600]]);
    const plan = initialPagePlan([first, second]);
    const firstPage = plan[0];
    const thirdPage = plan[2];
    if (firstPage === undefined || thirdPage === undefined) throw new Error("fixture page missing");
    const selected = [
      { ...thirdPage, rotation: 90 as const },
      firstPage,
    ];
    const bytes = await composePdf([first, second], selected, true);
    const output = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(output.getPageCount()).toBe(2);
    expect(output.getPage(0).getRotation().angle).toBe(90);
    expect(output.getPage(0).getSize()).toEqual({ height: 600, width: 500 });
    expect(output.getAuthor()).toBeUndefined();
  });

  test("turns a PNG image into a one-page PDF with its dimensions", async () => {
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (character) => character.charCodeAt(0));
    const sources = await preparePdfSources([new File([png], "pixel.png", { type: "image/png" })]);
    const source = sources[0];
    if (source === undefined) throw new Error("fixture source missing");
    const output = await PDFDocument.load(source.bytes);
    expect(output.getPageCount()).toBe(1);
    expect(output.getPage(0).getSize()).toEqual({ height: 1, width: 1 });
  });
});
