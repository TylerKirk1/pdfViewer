import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { searchDocument, type SearchResult } from "../../pdf/search";
import { useViewerStore } from "../../state/store";
import { IconButton } from "../../components/Button";
import { Icon } from "../../components/Icon";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
};

/** Splits `text` around case-insensitive matches of `query` so they can be marked up. */
function highlightParts(text: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [text];
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let idx = lower.indexOf(q); idx >= 0; idx = lower.indexOf(q, from)) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>);
    from = idx + q.length;
  }
  parts.push(text.slice(from));
  return parts;
}

export function SearchPanel({ doc, onSelectPage }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef({ aborted: false });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const highlightQuery = useViewerStore((s) => s.highlightQuery);
  const highlightCount = useViewerStore((s) => s.highlightCount);
  const highlightCursor = useViewerStore((s) => s.highlightCursor);
  const currentPage = useViewerStore((s) => s.pageNumber);
  const searchFocusNonce = useViewerStore((s) => s.searchFocusNonce);
  const setHighlightQuery = useViewerStore((s) => s.setHighlightQuery);
  const setHighlightCursor = useViewerStore((s) => s.setHighlightCursor);
  const bumpHighlightScrollNonce = useViewerStore((s) => s.bumpHighlightScrollNonce);

  useEffect(() => () => void (abortRef.current.aborted = true), []);

  useEffect(() => {
    abortRef.current.aborted = true;
    abortRef.current = { aborted: false };
    setQuery("");
    setResults(null);
    setIsSearching(false);
  }, [doc]);

  // Cleared elsewhere (e.g. a new file was opened): reset the panel too.
  useEffect(() => {
    if (!highlightQuery) setResults(null);
  }, [highlightQuery]);

  // Ctrl/⌘+F lands here.
  useEffect(() => {
    if (!searchFocusNonce) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [searchFocusNonce]);

  const totalMatches = useMemo(() => (results ?? []).reduce((acc, r) => acc + r.matchCount, 0), [results]);

  // Position of the active match across the whole document, e.g. "3 of 12".
  const globalPosition = useMemo(() => {
    if (!results?.length || !highlightCount) return null;
    let before = 0;
    for (const r of results) {
      if (r.pageNumber === currentPage) return before + Math.min(highlightCursor, r.matchCount - 1) + 1;
      before += r.matchCount;
    }
    return null;
  }, [results, currentPage, highlightCursor, highlightCount]);

  async function runSearch() {
    if (!doc) return;
    const q = query.trim();
    if (!q) return;
    abortRef.current.aborted = true;
    const signal = { aborted: false };
    abortRef.current = signal;

    setHighlightQuery(q);
    setIsSearching(true);
    try {
      const out = await searchDocument(doc, q, signal);
      if (signal.aborted) return;
      setResults(out);
      // Jump to the first match at or after the current page.
      const first = out.find((r) => r.pageNumber >= currentPage) ?? out[0];
      if (first) {
        onSelectPage(first.pageNumber);
        setHighlightCursor(0);
        bumpHighlightScrollNonce();
      }
    } finally {
      if (!signal.aborted) setIsSearching(false);
    }
  }

  function clearSearch() {
    abortRef.current.aborted = true;
    setQuery("");
    setResults(null);
    setIsSearching(false);
    setHighlightQuery("");
    inputRef.current?.focus();
  }

  /** Steps through matches on this page, then on to the next/previous page with matches. */
  function step(dir: 1 | -1) {
    const next = highlightCursor + dir;
    if (highlightCount > 0 && next >= 0 && next < highlightCount) {
      setHighlightCursor(next);
      bumpHighlightScrollNonce();
      return;
    }
    const pages = (results ?? []).map((r) => r.pageNumber);
    if (!pages.length) {
      if (highlightCount > 0) {
        setHighlightCursor((next + highlightCount) % highlightCount);
        bumpHighlightScrollNonce();
      }
      return;
    }
    const idx = pages.indexOf(currentPage);
    const target =
      idx >= 0
        ? pages[(idx + dir + pages.length) % pages.length]!
        : dir > 0
          ? (pages.find((p) => p > currentPage) ?? pages[0]!)
          : ([...pages].reverse().find((p) => p < currentPage) ?? pages[pages.length - 1]!);
    const targetResult = results!.find((r) => r.pageNumber === target)!;
    onSelectPage(target);
    setHighlightCursor(dir > 0 ? 0 : Math.max(0, targetResult.matchCount - 1));
    bumpHighlightScrollNonce();
  }

  if (!doc) return <p className="panelEmpty">Open a PDF to search its text.</p>;

  const canStep = highlightCount > 1 || (results?.length ?? 0) > 0;

  return (
    <div className="search">
      <div className="searchField">
        <Icon name="search" size={16} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search document"
          aria-label="Search query"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim() && (query.trim() !== highlightQuery || !results)) void runSearch();
              else step(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              clearSearch();
            }
          }}
        />
        {query || results ? <IconButton icon="x" label="Clear search" onClick={clearSearch} /> : null}
      </div>

      <div className="searchMeta">
        <span aria-live="polite">
          {isSearching
            ? "Searching…"
            : results === null
              ? "Press Enter to search"
              : totalMatches === 0
                ? "No matches"
                : globalPosition
                  ? `${globalPosition} of ${totalMatches}`
                  : `${totalMatches} match${totalMatches === 1 ? "" : "es"} on ${results.length} page${results.length === 1 ? "" : "s"}`}
        </span>
        <span className="searchMeta__nav">
          <IconButton icon="chevronUp" label="Previous match" title="Previous match (Shift+Enter)" disabled={!canStep} onClick={() => step(-1)} />
          <IconButton icon="chevronDown" label="Next match" title="Next match (Enter)" disabled={!canStep} onClick={() => step(1)} />
        </span>
      </div>

      {results?.length ? (
        <ul className="results">
          {results.map((r) => (
            <li key={r.pageNumber}>
              <button
                type="button"
                className={`result ${r.pageNumber === currentPage ? "result--current" : ""}`}
                onClick={() => {
                  onSelectPage(r.pageNumber);
                  setHighlightCursor(0);
                  bumpHighlightScrollNonce();
                }}
              >
                <span className="result__top">
                  <span>Page {r.pageNumber}</span>
                  <span>{r.matchCount}</span>
                </span>
                <span className="result__snippet">{highlightParts(r.snippet, highlightQuery)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
