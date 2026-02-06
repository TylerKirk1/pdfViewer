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
import { MinimalLinkService } from "./pdf/linkService";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function ViewerShell() {
  const source = useViewerStore((s) => s.source);
  const pageNumber = useViewerStore((s) => s.pageNumber);
  const numPages = useViewerStore((s) => s.numPages);
  const scale = useViewerStore((s) => s.scale);
  const rotation = useViewerStore((s) => s.rotation);
  const viewMode = useViewerStore((s) => s.viewMode);
  const fitMode = useViewerStore((s) => s.fitMode);
  const highlightQuery = useViewerStore((s) => s.highlightQuery);
  const highlightCursor = useViewerStore((s) => s.highlightCursor);
  const highlightScrollNonce = useViewerStore((s) => s.highlightScrollNonce);
  const isSidebarOpen = useViewerStore((s) => s.isSidebarOpen);

  const setSource = useViewerStore((s) => s.setSource);
  const setNumPages = useViewerStore((s) => s.setNumPages);
  const setPageNumber = useViewerStore((s) => s.setPageNumber);
  const setScale = useViewerStore((s) => s.setScale);
  const setRotation = useViewerStore((s) => s.setRotation);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const setFitMode = useViewerStore((s) => s.setFitMode);
  const setHighlightCount = useViewerStore((s) => s.setHighlightCount);
  const setHighlightCursor = useViewerStore((s) => s.setHighlightCursor);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const resetView = useViewerStore((s) => s.resetView);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportRect = useResizeObserver(viewportRef);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [fitScale, setFitScale] = useState<number | null>(null);
  const [linkService] = useState(
    () =>
      new MinimalLinkService({
        doc: null,
        setPage: setPageNumber,
        getPage: () => useViewerStore.getState().pageNumber,
        getRotation: () => useViewerStore.getState().rotation
      })
  );
  const annotationStorage = null;

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
        linkService.setDocument(loaded);
        setNumPages(loaded?.numPages ?? 0);
      } catch (e) {
        if (cancelled) return;
        setDoc(null);
        linkService.setDocument(null);
        setNumPages(0);
        setLoadError(e instanceof Error ? e.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, setNumPages, linkService]);

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

  const syncHighlights = useCallback(() => {
    const root = viewportRef.current;
    if (!root) return;
    const activePageEl = viewMode === "single" ? root.querySelector("[data-single]") : root.querySelector(`[data-page="${pageNumber}"]`);
    if (!activePageEl) return;
    const tl = activePageEl.querySelector(".textLayer");
    if (!tl) return;
    const marks = Array.from(tl.querySelectorAll("mark.hl")) as HTMLElement[];
    setHighlightCount(marks.length);
    const cursor = marks.length > 0 ? clamp(highlightCursor, 0, marks.length - 1) : 0;
    if (marks.length > 0 && cursor !== highlightCursor) setHighlightCursor(cursor);
    for (let i = 0; i < marks.length; i++) marks[i].classList.toggle("hl--active", i === cursor);
  }, [highlightCursor, setHighlightCount, setHighlightCursor, pageNumber, viewMode]);

  useEffect(() => syncHighlights(), [syncHighlights]);

  useEffect(() => {
    if (!highlightQuery.trim()) return;
    const root = viewportRef.current;
    if (!root) return;
    const activePageEl = viewMode === "single" ? root.querySelector("[data-single]") : root.querySelector(`[data-page="${pageNumber}"]`);
    if (!activePageEl) return;
    const tl = activePageEl.querySelector(".textLayer");
    if (!tl) return;
    const marks = Array.from(tl.querySelectorAll("mark.hl")) as HTMLElement[];
    const el = marks[highlightCursor];
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ block: "center", inline: "nearest" }));
  }, [highlightScrollNonce, highlightCursor, highlightQuery, pageNumber, viewMode]);

  const openFile = useCallback(
    async (file: File) => {
      const data = await file.arrayBuffer();
      setSource({ kind: "file", name: file.name, data });
    },
    [setSource]
  );

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

  const scrollViewerSuppressAutoScroll = useRef(false);

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
            onClick={() => setViewMode(viewMode === "single" ? "scroll" : "single")}
            aria-label="Toggle scroll mode"
            className={viewMode === "scroll" ? "btn--on" : ""}
          >
            ⇵
          </Button>

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
          <Button onClick={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)} aria-label="Rotate">
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
        {isSidebarOpen ? <Sidebar doc={doc} loadError={loadError} /> : null}

        <main className={`viewer ${viewMode === "scroll" ? "viewer--scroll" : ""}`} ref={viewportRef}>
          {viewMode === "single" ? (
            <SinglePageViewer
              doc={doc}
              pageNumber={pageNumber}
              scale={effectiveScale}
              rotation={rotation}
              highlightQuery={highlightQuery}
              linkService={linkService}
              annotationStorage={annotationStorage}
              isLoading={isLoading}
              hasNoSource={source.kind === "none"}
              onAfterRender={syncHighlights}
            />
          ) : (
            <ScrollViewer
              doc={doc}
              scale={effectiveScale}
              rotation={rotation}
              highlightQuery={highlightQuery}
              linkService={linkService}
              annotationStorage={annotationStorage}
              isLoading={isLoading}
              hasNoSource={source.kind === "none"}
              currentPage={pageNumber}
              onActivePage={(n) => {
                scrollViewerSuppressAutoScroll.current = true;
                setPageNumber(n);
              }}
              onAfterRenderCurrent={syncHighlights}
              suppressAutoScrollRef={scrollViewerSuppressAutoScroll}
            />
          )}
        </main>
      </div>

      {isThemeOpen ? <ThemePanel onClose={() => setIsThemeOpen(false)} /> : null}
    </div>
  );
}

function SinglePageViewer(props: {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  rotation: number;
  highlightQuery: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationStorage: any;
  isLoading: boolean;
  hasNoSource: boolean;
  onAfterRender: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const annotationLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!props.doc) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      await renderPage({
        doc: props.doc,
        pageNumber: clamp(props.pageNumber, 1, props.doc.numPages),
        canvas,
        textLayer: textLayerRef.current,
        annotationLayer: annotationLayerRef.current,
        scale: props.scale,
        rotation: props.rotation,
        highlightQuery: props.highlightQuery,
        linkService: props.linkService,
        annotationStorage: props.annotationStorage
      });
      if (!cancelled) props.onAfterRender();
    })();
    return () => {
      cancelled = true;
    };
  }, [props.doc, props.pageNumber, props.scale, props.rotation, props.highlightQuery, props.linkService, props.annotationStorage, props.onAfterRender]);

  return (
    <div className="paper" aria-label="PDF page" data-single>
      {props.isLoading ? <div className="status">Loading…</div> : null}
      {!props.isLoading && props.hasNoSource ? (
        <div className="drop">
          <div className="drop__title">Drop a PDF</div>
          <div className="drop__sub">or use Open</div>
        </div>
      ) : null}
      <div className="pageStack">
        <canvas ref={canvasRef} className="canvas" />
        <div ref={textLayerRef} className="textLayer" aria-label="Text layer" />
        <div ref={annotationLayerRef} className="annotationLayer" aria-label="Links and forms" />
      </div>
      {props.doc ? <div className="corner">{Math.round(props.scale * 100)}%</div> : null}
    </div>
  );
}

function ScrollViewer(props: {
  doc: PDFDocumentProxy | null;
  scale: number;
  rotation: number;
  highlightQuery: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationStorage: any;
  isLoading: boolean;
  hasNoSource: boolean;
  currentPage: number;
  onActivePage: (n: number) => void;
  onAfterRenderCurrent: () => void;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  const pages = useMemo(() => {
    if (!props.doc) return [];
    return Array.from({ length: props.doc.numPages }, (_, i) => i + 1);
  }, [props.doc]);

  useEffect(() => {
    if (!props.doc) return;
    if (props.suppressAutoScrollRef.current) {
      props.suppressAutoScrollRef.current = false;
      return;
    }
    const el = pageRefs.current.get(props.currentPage);
    if (!el) return;
    el.scrollIntoView({ block: "start", inline: "nearest" });
  }, [props.currentPage, props.doc, props.suppressAutoScrollRef]);

  return (
    <div className="scrollStack" ref={rootRef}>
      {props.isLoading ? <div className="status">Loading…</div> : null}
      {!props.isLoading && props.hasNoSource ? (
        <div className="drop">
          <div className="drop__title">Drop a PDF</div>
          <div className="drop__sub">or use Open</div>
        </div>
      ) : null}

      {pages.map((n) => (
        <ScrollPage
          key={n}
          root={rootRef.current}
          register={(el) => pageRefs.current.set(n, el)}
          doc={props.doc!}
          pageNumber={n}
          isCurrent={n === props.currentPage}
          scale={props.scale}
          rotation={props.rotation}
          highlightQuery={props.highlightQuery}
          linkService={props.linkService}
          annotationStorage={props.annotationStorage}
          onActive={() => props.onActivePage(n)}
          onAfterRender={() => n === props.currentPage && props.onAfterRenderCurrent()}
        />
      ))}
    </div>
  );
}

function ScrollPage(props: {
  root: Element | null;
  register: (el: HTMLDivElement) => void;
  doc: PDFDocumentProxy;
  pageNumber: number;
  isCurrent: boolean;
  scale: number;
  rotation: number;
  highlightQuery: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationStorage: any;
  onActive: () => void;
  onAfterRender: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const annotationLayerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    props.register(el);
  }, [props]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) props.onActive();
      },
      { root: props.root, threshold: [0.01, 0.6], rootMargin: "400px 0px 400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [props.root, props.onActive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!visible) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      await renderPage({
        doc: props.doc,
        pageNumber: props.pageNumber,
        canvas,
        textLayer: textLayerRef.current,
        annotationLayer: annotationLayerRef.current,
        scale: props.scale,
        rotation: props.rotation,
        highlightQuery: props.isCurrent ? props.highlightQuery : "",
        linkService: props.linkService,
        annotationStorage: props.annotationStorage
      });
      if (!cancelled) props.onAfterRender();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    visible,
    props.doc,
    props.pageNumber,
    props.scale,
    props.rotation,
    props.highlightQuery,
    props.isCurrent,
    props.linkService,
    props.annotationStorage,
    props.onAfterRender
  ]);

  return (
    <div
      ref={wrapRef}
      className={`paper paper--scroll ${props.isCurrent ? "paper--current" : ""}`}
      data-page={props.pageNumber}
      aria-label={`PDF page ${props.pageNumber}`}
    >
      <div className="pageStack">
        <canvas ref={canvasRef} className="canvas" />
        <div ref={textLayerRef} className="textLayer" />
        <div ref={annotationLayerRef} className="annotationLayer" />
      </div>
      <div className="corner corner--page">{props.pageNumber}</div>
    </div>
  );
}
