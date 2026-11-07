import React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useViewerStore, type SidebarTab } from "../state/store";
import { ThumbnailsPanel } from "./panels/ThumbnailsPanel";
import { OutlinePanel } from "./panels/OutlinePanel";
import { SearchPanel } from "./panels/SearchPanel";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
  /** Render as an overlay drawer (small screens) instead of a column. */
  drawer?: boolean;
};

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "thumbs", label: "Pages" },
  { id: "outline", label: "Outline" },
  { id: "search", label: "Search" }
];

export function Sidebar({ doc, onSelectPage, drawer }: Props) {
  const tab = useViewerStore((s) => s.sidebarTab);
  const setTab = useViewerStore((s) => s.setSidebarTab);
  const pageNumber = useViewerStore((s) => s.pageNumber);

  return (
    <aside className={`sidebar ${drawer ? "sidebar--drawer" : ""}`} aria-label="Sidebar">
      <div className="tabs" role="tablist" aria-label="Sidebar sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "thumbs" ? <ThumbnailsPanel doc={doc} pageNumber={pageNumber} onSelectPage={onSelectPage} /> : null}
        {tab === "outline" ? <OutlinePanel doc={doc} onSelectPage={onSelectPage} /> : null}
        {tab === "search" ? <SearchPanel doc={doc} onSelectPage={onSelectPage} /> : null}
      </div>
    </aside>
  );
}
