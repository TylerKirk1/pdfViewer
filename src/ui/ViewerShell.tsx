import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdf } from "./pdf/loadPdf";
import { renderPage } from "./pdf/renderPage";
import { useViewerStore } from "./state/store";
import { Button } from "./components/Button";
import { Slider } from "./components/Slider";
import { ThemePanel } from "./theme/ThemePanel";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function ViewerShell() {
  const source = useViewerStore((s) => s.source);
  const pageNumber = useViewerStore((s) => s.pageNumber);
  const numPages = useViewerStore((s) => s.numPages);
  const scale = useViewerStore((s) => s.scale);
  const rotation = useViewerStore((s) => s.rotation);
  const isSidebarOpen = useViewerStore((s) => s.isSidebarOpen);

  const setSource = useViewerStore((s) => s.setSource);
  const setNumPages = useViewerStore((s) => s.setNumPages);
  const setPageNumber = useViewerStore((s) => s.setPageNumber);
  const setScale = useViewerStore((s) => s.setScale);
  const setRotation = useViewerStore((s) => s.setRotation);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const resetView = useViewerStore((s) => s.resetView);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const title = useMemo(() => {
    if (source.kind === "file") return source.name;
    if (source.kind === "url") return source.url;
    return "pdfViewer";
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const loaded = await loadPdf(source);
        if (cancelled) return;
        setDoc(loaded);
        setNumPages(loaded?.numPages ?? 0);
      } catch (e) {
        if (cancelled) return;
        setDoc(null);
        setNumPages(0);
        setLoadError(e instanceof Error ? e.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, setNumPages]);

  const doRender = useCallback(async () => {
    if (!doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    await renderPage({
      doc,
      pageNumber: clamp(pageNumber, 1, doc.numPages),
      canvas,
      scale,
      rotation
    });
  }, [doc, pageNumber, scale, rotation]);

  useEffect(() => {
    void doRender();
  }, [doRender]);

  const openFile = useCallback(async (file: File) => {
    const data = await file.arrayBuffer();
    setSource({ kind: "file", name: file.name, data });
  }, [setSource]);

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await openFile(file);
      e.target.value = "";
    },
    [openFile]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) return;
      await openFile(file);
    },
    [openFile]
  );

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!doc) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setPageNumber(clamp(pageNumber - 1, 1, doc.numPages));
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setPageNumber(clamp(pageNumber + 1, 1, doc.numPages));
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setScale(clamp(Number((scale + 0.1).toFixed(2)), 0.5, 3));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setScale(clamp(Number((scale - 0.1).toFixed(2)), 0.5, 3));
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetView();
      }
    },
    [doc, pageNumber, scale, setPageNumber, setScale, resetView]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <header className="topbar">
        <div className="topbar__left">
          <Button onClick={toggleSidebar} aria-label="Toggle sidebar">
            ☰
          </Button>
          <div className="title" title={title}>
            {title}
          </div>
        </div>
        <div className="topbar__center">
          <Button
            onClick={() => doc && setPageNumber(clamp(pageNumber - 1, 1, doc.numPages))}
            disabled={!doc || pageNumber <= 1}
            aria-label="Previous page"
          >
            ◀
          </Button>
          <div className="pagebox">
            <input
              className="pagebox__input"
              inputMode="numeric"
              value={doc ? String(pageNumber) : ""}
              placeholder="–"
              aria-label="Page number"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                if (!doc) return;
                setPageNumber(clamp(n, 1, doc.numPages));
              }}
            />
            <span className="pagebox__slash">/</span>
            <span className="pagebox__total">{doc ? doc.numPages : "–"}</span>
          </div>
          <Button
            onClick={() => doc && setPageNumber(clamp(pageNumber + 1, 1, doc.numPages))}
            disabled={!doc || pageNumber >= numPages}
            aria-label="Next page"
          >
            ▶
          </Button>
        </div>
        <div className="topbar__right">
          <div className="zoom">
            <Button onClick={() => setScale(clamp(Number((scale - 0.1).toFixed(2)), 0.5, 3))} aria-label="Zoom out">
              −
            </Button>
            <Slider
              value={Math.round(scale * 100)}
              min={50}
              max={300}
              step={5}
              aria-label="Zoom"
              onChange={(v) => setScale(Number((v / 100).toFixed(2)))}
            />
            <Button onClick={() => setScale(clamp(Number((scale + 0.1).toFixed(2)), 0.5, 3))} aria-label="Zoom in">
              +
            </Button>
          </div>
          <Button
            onClick={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)}
            aria-label="Rotate"
          >
            ↻
          </Button>
          <Button onClick={() => setIsThemeOpen((v) => !v)} aria-label="Theme">
            ◐
          </Button>
          <label className="filebtn">
            Open
            <input className="filebtn__input" type="file" accept="application/pdf" onChange={onPickFile} />
          </label>
        </div>
      </header>

      <div className="body">
        {isSidebarOpen ? (
          <aside className="sidebar">
            <div className="sidebar__section">
              <div className="sidebar__title">Tips</div>
              <div className="sidebar__text">
                Drag and drop a PDF here, or click <span className="kbd">Open</span>.
              </div>
              <div className="sidebar__text">
                Keys: <span className="kbd">←</span>/<span className="kbd">→</span> page,{" "}
                <span className="kbd">Ctrl</span>+<span className="kbd">+</span>/<span className="kbd">−</span> zoom.
              </div>
            </div>
            {loadError ? (
              <div className="sidebar__error">{loadError}</div>
            ) : null}
          </aside>
        ) : null}

        <main className="viewer">
          <div className="paper">
            {isLoading ? <div className="status">Loading…</div> : null}
            {!isLoading && source.kind === "none" ? (
              <div className="drop">
                <div className="drop__title">Drop a PDF</div>
                <div className="drop__sub">or use Open</div>
              </div>
            ) : null}
            <canvas ref={canvasRef} className="canvas" />
          </div>
        </main>
      </div>

      {isThemeOpen ? <ThemePanel onClose={() => setIsThemeOpen(false)} /> : null}
    </div>
  );
}

