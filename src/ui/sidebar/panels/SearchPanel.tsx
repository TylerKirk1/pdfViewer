import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { searchDocument, type SearchResult } from "../../pdf/search";
import { useViewerStore } from "../../state/store";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function SearchPanel({ doc, onSelectPage }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef({ aborted: false });
  const setHighlightQuery = useViewerStore((s) => s.setHighlightQuery);
  const highlightQuery = useViewerStore((s) => s.highlightQuery);
  const highlightCount = useViewerStore((s) => s.highlightCount);
  const highlightCursor = useViewerStore((s) => s.highlightCursor);
  const setHighlightCursor = useViewerStore((s) => s.setHighlightCursor);
  const bumpHighlightScrollNonce = useViewerStore((s) => s.bumpHighlightScrollNonce);
  const currentPage = useViewerStore((s) => s.pageNumber);

  useEffect(() => {
    return () => {
      abortRef.current.aborted = true;
    };
  }, []);

  useEffect(() => {
    // Reset when doc changes.
    setQuery("");
    setResults([]);
    setIsSearching(false);
    abortRef.current = { aborted: false };
  }, [doc]);

  useEffect(() => {
    // If highlight is cleared elsewhere (e.g. opening a new file), keep this panel in sync.
    if (!highlightQuery) {
      setQuery("");
      setResults([]);
    }
  }, [highlightQuery]);

  const totalMatches = useMemo(() => results.reduce((acc, r) => acc + r.matchCount, 0), [results]);
  const pagesWithMatches = useMemo(() => results.map((r) => r.pageNumber), [results]);

  async function runSearch() {
    if (!doc) return;
    const q = query.trim();
    setHighlightQuery(q);
    setHighlightCursor(0);
    bumpHighlightScrollNonce();
    abortRef.current.aborted = true;
    abortRef.current = { aborted: false };
    const localSignal = abortRef.current;

    setIsSearching(true);
    try {
      const out = await searchDocument(doc, query, localSignal);
      if (!localSignal.aborted) setResults(out);
    } finally {
      if (!localSignal.aborted) setIsSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setHighlightQuery("");
  }

  function gotoPrevNextResult(dir: -1 | 1) {
    if (!pagesWithMatches.length) return;
    const idx = pagesWithMatches.indexOf(currentPage);
    const nextIdx = idx === -1 ? 0 : (idx + dir + pagesWithMatches.length) % pagesWithMatches.length;
    const targetPage = pagesWithMatches[nextIdx]!;
    onSelectPage(targetPage);
    setHighlightCursor(0);
    bumpHighlightScrollNonce();
  }

  function gotoPrevNextHighlight(dir: -1 | 1) {
    if (highlightCount <= 0) return;
    const next = (highlightCursor + dir + highlightCount) % highlightCount;
    setHighlightCursor(next);
    bumpHighlightScrollNonce();
  }

  if (!doc) {
    return (
      <div className="panelEmpty">
        <div className="panelEmpty__title">Search</div>
        <div className="panelEmpty__hint">Open a PDF to search its text.</div>
      </div>
    );
  }

  return (
    <div className="search">
      <div className="search__row">
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find text…"
          aria-label="Search query"
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
        />
        <button className="apply" onClick={() => void runSearch()} disabled={!query.trim() || isSearching}>
          {isSearching ? "…" : "Go"}
        </button>
      </div>

      <div className="search__meta">
        {results.length ? (
          <div className="searchMeta">
            <span>
              {totalMatches} match{totalMatches === 1 ? "" : "es"} on {results.length} page{results.length === 1 ? "" : "s"}
            </span>
            <span className="muted">
              This page: {highlightCount ? `${clamp(highlightCursor + 1, 1, highlightCount)}/${highlightCount}` : "0"}
            </span>
          </div>
        ) : (
          <span className="muted">Tip: Enter a phrase and press Enter.</span>
        )}
      </div>

      <div className="search__actions" aria-label="Search navigation">
        <button className="btn btn--ghost" onClick={() => gotoPrevNextHighlight(-1)} disabled={highlightCount <= 1} aria-label="Previous match on page">
          ◀ Match
        </button>
        <button className="btn btn--ghost" onClick={() => gotoPrevNextHighlight(1)} disabled={highlightCount <= 1} aria-label="Next match on page">
          Match ▶
        </button>
        <button className="btn btn--ghost" onClick={() => gotoPrevNextResult(-1)} disabled={!pagesWithMatches.length} aria-label="Previous result page">
          ◀ Page
        </button>
        <button className="btn btn--ghost" onClick={() => gotoPrevNextResult(1)} disabled={!pagesWithMatches.length} aria-label="Next result page">
          Page ▶
        </button>
        <button className="btn btn--ghost" onClick={clearSearch} disabled={!query && !results.length} aria-label="Clear search">
          Clear
        </button>
      </div>

      <div className="search__results">
        {results.map((r) => (
          <button
            key={r.pageNumber}
            className="result"
            onClick={() => {
              onSelectPage(r.pageNumber);
              setHighlightCursor(0);
              bumpHighlightScrollNonce();
            }}
          >
            <div className="result__top">
              <span className="result__page">Page {r.pageNumber}</span>
              <span className="result__count">{r.matchCount}</span>
            </div>
            <div className="result__snippet">{r.snippet}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
