import type { PDFDocumentProxy } from "pdfjs-dist";

export type SearchResult = {
  pageNumber: number;
  snippet: string;
  matchCount: number;
};

type AbortLike = { aborted: boolean };

export async function searchDocument(
  doc: PDFDocumentProxy,
  queryRaw: string,
  signal: AbortLike
): Promise<SearchResult[]> {
  const query = queryRaw.trim();
  if (!query) return [];

  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    if (signal.aborted) return results;

    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    if (signal.aborted) return results;

    const text = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");

    const lower = text.toLowerCase();
    let from = 0;
    let matchCount = 0;
    let firstIdx = -1;
    while (true) {
      const idx = lower.indexOf(q, from);
      if (idx < 0) break;
      if (firstIdx < 0) firstIdx = idx;
      matchCount++;
      from = idx + q.length;
    }

    if (matchCount > 0) {
      const start = Math.max(0, firstIdx - 50);
      const end = Math.min(text.length, firstIdx + query.length + 80);
      const snippet = (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
      results.push({ pageNumber, snippet, matchCount });
    }
  }

  return results;
}

