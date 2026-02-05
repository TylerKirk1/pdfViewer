import React, { useMemo } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useViewerStore } from "../state/store";
import { Button } from "../components/Button";
import { ThumbnailsPanel } from "./panels/ThumbnailsPanel";
import { OutlinePanel } from "./panels/OutlinePanel";
import { SearchPanel } from "./panels/SearchPanel";

type Props = {
  doc: PDFDocumentProxy | null;
  loadError: string | null;
};

export function Sidebar({ doc, loadError }: Props) {
  const tab = useViewerStore((s) => s.sidebarTab);
  const setTab = useViewerStore((s) => s.setSidebarTab);
  const pageNumber = useViewerStore((s) => s.pageNumber);
  const setPageNumber = useViewerStore((s) => s.setPageNumber);

  const tabs = useMemo(
    () =>
      [
        { id: "thumbs" as const, label: "Pages" },
        { id: "outline" as const, label: "Outline" },
        { id: "search" as const, label: "Search" }
      ] as const,
    []
  );

  return (
    <aside className="sidebar">
      <div className="sidebar__tabs" role="tablist" aria-label="Sidebar">
        {tabs.map((t) => (
          <Button
            key={t.id}
            className={`tab ${tab === t.id ? "tab--active" : ""}`}
            aria-label={t.label}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="sidebar__content">
        {loadError ? <div className="sidebar__error">{loadError}</div> : null}

        {tab === "thumbs" ? <ThumbnailsPanel doc={doc} pageNumber={pageNumber} onSelectPage={setPageNumber} /> : null}
        {tab === "outline" ? <OutlinePanel doc={doc} onSelectPage={setPageNumber} /> : null}
        {tab === "search" ? <SearchPanel doc={doc} onSelectPage={setPageNumber} /> : null}
      </div>
    </aside>
  );
}

