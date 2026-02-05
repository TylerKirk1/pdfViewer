import type { PDFDocumentProxy } from "pdfjs-dist";

export type OutlineNode = {
  title: string;
  dest: unknown;
  items: OutlineNode[];
};

export async function getOutlineSafe(doc: PDFDocumentProxy): Promise<OutlineNode[]> {
  try {
    const outline = await doc.getOutline();
    if (!outline) return [];
    return outline as unknown as OutlineNode[];
  } catch {
    return [];
  }
}

export async function resolveDestToPageNumber(doc: PDFDocumentProxy, dest: unknown): Promise<number | null> {
  try {
    const resolved = typeof dest === "string" ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(resolved)) return null;
    const ref = resolved[0] as unknown;
    // In PDF.js, destination[0] is typically a Ref to the page.
    // getPageIndex returns 0-based.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = await doc.getPageIndex(ref as any);
    return idx + 1;
  } catch {
    return null;
  }
}

