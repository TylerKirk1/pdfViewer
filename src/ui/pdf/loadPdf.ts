import type { PDFDocumentProxy } from "pdfjs-dist";
import { getPdfjs } from "./pdfjs";
import type { PdfSource } from "../state/store";

export async function loadPdf(source: PdfSource): Promise<PDFDocumentProxy | null> {
  if (source.kind === "none") return null;
  const pdfjsLib = await getPdfjs();
  if (source.kind === "url") {
    return await pdfjsLib.getDocument({ url: source.url }).promise;
  }
  // pdf.js transfers (detaches) the buffer it is given. Hand it a copy so the
  // original survives a second load, e.g. React StrictMode re-running effects.
  return await pdfjsLib.getDocument({ data: new Uint8Array(source.data.slice(0)) }).promise;
}

export function describeLoadError(e: unknown) {
  const name = typeof e === "object" && e !== null ? (e as { name?: string }).name : undefined;
  if (name === "PasswordException") return "This PDF is password-protected, which isn't supported yet.";
  if (name === "InvalidPDFException") return "This file doesn't look like a valid PDF.";
  if (name === "MissingPDFException") return "The file couldn't be found.";
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong while opening this file.";
}
