import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { searchDocument, type SearchResult } from "../../pdf/search";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
};

export function SearchPanel({ doc, onSelectPage }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef({ aborted: false });

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

  const totalMatches = useMemo(() => results.reduce((acc, r) => acc + r.matchCount, 0), [results]);

  async function runSearch() {
    if (!doc) return;
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
          <span>
            {totalMatches} match{totalMatches === 1 ? "" : "es"} on {results.length} page{results.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="muted">Tip: Enter a phrase and press Enter.</span>
        )}
      </div>

      <div className="search__results">
        {results.map((r) => (
          <button key={r.pageNumber} className="result" onClick={() => onSelectPage(r.pageNumber)}>
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

