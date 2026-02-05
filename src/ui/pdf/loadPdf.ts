import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "./pdfjs";
import type { PdfSource } from "../state/store";

export async function loadPdf(source: PdfSource): Promise<PDFDocumentProxy | null> {
  if (source.kind === "none") return null;
  if (source.kind === "url") {
    const task = pdfjsLib.getDocument({ url: source.url });
    return await task.promise;
  }
  const task = pdfjsLib.getDocument({ data: source.data });
  return await task.promise;
}

