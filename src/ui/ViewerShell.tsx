import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdf } from "./pdf/loadPdf";
import { renderPage } from "./pdf/renderPage";
import { useViewerStore } from "./state/store";
import { Button } from "./components/Button";
import { Slider } from "./components/Slider";
import { ThemePanel } from "./theme/ThemePanel";
import { Sidebar } from "./sidebar/Sidebar";
import { useResizeObserver } from "./hooks/useResizeObserver";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function ViewerShell() {
  const source = useViewerStore((s) => s.source);
  const pageNumber = useViewerStore((s) => s.pageNumber);
  const numPages = useViewerStore((s) => s.numPages);
  const scale = useViewerStore((s) => s.scale);
  const rotation = useViewerStore((s) => s.rotation);
  const fitMode = useViewerStore((s) => s.fitMode);
  const isSidebarOpen = useViewerStore((s) => s.isSidebarOpen);

  const setSource = useViewerStore((s) => s.setSource);
  const setNumPages = useViewerStore((s) => s.setNumPages);
  const setPageNumber = useViewerStore((s) => s.setPageNumber);
  const setScale = useViewerStore((s) => s.setScale);
  const setRotation = useViewerStore((s) => s.setRotation);
  const setFitMode = useViewerStore((s) => s.setFitMode);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const resetView = useViewerStore((s) => s.resetView);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportRect = useResizeObserver(viewportRef);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [fitScale, setFitScale] = useState<number | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!doc) {
        setFitScale(null);
        return;
      }
      if (fitMode === "free") {
        setFitScale(null);
        return;
      }
      if (!viewportRect) return;
      const page = await doc.getPage(clamp(pageNumber, 1, doc.numPages));
      if (cancelled) return;
      const v1 = page.getViewport({ scale: 1, rotation });
      const pad = 44; // viewer padding + paper padding
      const availW = Math.max(240, viewportRect.width - pad);
      const availH = Math.max(240, viewportRect.height - pad);
      const sWidth = availW / v1.width;
      if (fitMode === "width") {
        setFitScale(clamp(Number(sWidth.toFixed(3)), 0.25, 5));
        return;
      }
      const sHeight = availH / v1.height;
      const sPage = Math.min(sWidth, sHeight);
      setFitScale(clamp(Number(sPage.toFixed(3)), 0.25, 5));
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, fitMode, pageNumber, rotation, viewportRect]);

  const effectiveScale = fitMode === "free" ? scale : fitScale ?? scale;

  const doRender = useCallback(async () => {
    if (!doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    await renderPage({
      doc,
      pageNumber: clamp(pageNumber, 1, doc.numPages),
      canvas,
      scale: effectiveScale,
      rotation
    });
  }, [doc, pageNumber, effectiveScale, rotation]);

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
        setScale(clamp(Number((effectiveScale + 0.1).toFixed(2)), 0.5, 3));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setScale(clamp(Number((effectiveScale - 0.1).toFixed(2)), 0.5, 3));
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetView();
      }
    },
    [doc, pageNumber, effectiveScale, setPageNumber, setScale, resetView]
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
            <Button onClick={() => setScale(clamp(Number((effectiveScale - 0.1).toFixed(2)), 0.5, 3))} aria-label="Zoom out">
              −
            </Button>
            <Slider
              value={Math.round(effectiveScale * 100)}
              min={50}
              max={300}
              step={5}
              aria-label="Zoom"
              onChange={(v) => setScale(Number((v / 100).toFixed(2)))}
            />
            <Button onClick={() => setScale(clamp(Number((effectiveScale + 0.1).toFixed(2)), 0.5, 3))} aria-label="Zoom in">
              +
            </Button>
          </div>
          <Button
            onClick={() => setFitMode(fitMode === "width" ? "free" : "width")}
            aria-label="Fit to width"
            className={fitMode === "width" ? "btn--on" : ""}
          >
            ↔
          </Button>
          <Button
            onClick={() => setFitMode(fitMode === "page" ? "free" : "page")}
            aria-label="Fit to page"
            className={fitMode === "page" ? "btn--on" : ""}
          >
            ⤢
          </Button>
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
          <Sidebar doc={doc} loadError={loadError} />
        ) : null}

        <main className="viewer" ref={viewportRef}>
          <div className="paper" aria-label="PDF page">
            {isLoading ? <div className="status">Loading…</div> : null}
            {!isLoading && source.kind === "none" ? (
              <div className="drop">
                <div className="drop__title">Drop a PDF</div>
                <div className="drop__sub">or use Open</div>
              </div>
            ) : null}
            <canvas ref={canvasRef} className="canvas" />
            {doc ? <div className="corner">{Math.round(effectiveScale * 100)}%</div> : null}
          </div>
        </main>
      </div>

      {isThemeOpen ? <ThemePanel onClose={() => setIsThemeOpen(false)} /> : null}
    </div>
  );
}
