import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { describeLoadError, loadPdf } from "./pdf/loadPdf";
import { MinimalLinkService } from "./pdf/linkService";
import { clampScale, nextZoom, useViewerStore, type PdfSource } from "./state/store";
import { Toolbar } from "./Toolbar";
import { Sidebar } from "./sidebar/Sidebar";
import { DocumentView } from "./viewer/DocumentView";
import type { PageSize } from "./viewer/PageView";
import { EmptyState, ErrorState, LoadingState } from "./EmptyState";
import { useElementSize } from "./hooks/useElementSize";
import { useMediaQuery } from "./hooks/useMediaQuery";

const SAMPLE_URL = `${import.meta.env.BASE_URL}sample.pdf`;
const NOTICE_MS = 3200;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function sourceName(source: PdfSource) {
  if (source.kind === "file") return source.name;
  if (source.kind === "url") {
    const last = source.url.split(/[?#]/)[0]!.split("/").pop() ?? "";
    try {
      return decodeURIComponent(last) || "Document";
    } catch {
      return last || "Document";
    }
  }
  return "";
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest("input, textarea, select, [contenteditable='true']");
}

export function ViewerShell() {
  const source = useViewerStore((s) => s.source);
  const pageNumber = useViewerStore((s) => s.pageNumber);
  const numPages = useViewerStore((s) => s.numPages);
  const scale = useViewerStore((s) => s.scale);
  const fitMode = useViewerStore((s) => s.fitMode);
  const rotation = useViewerStore((s) => s.rotation);
  const viewMode = useViewerStore((s) => s.viewMode);
  const theme = useViewerStore((s) => s.theme);
  const highlightQuery = useViewerStore((s) => s.highlightQuery);
  const highlightCursor = useViewerStore((s) => s.highlightCursor);
  const highlightScrollNonce = useViewerStore((s) => s.highlightScrollNonce);
  const isSidebarOpen = useViewerStore((s) => s.isSidebarOpen);

  const setSource = useViewerStore((s) => s.setSource);
  const setNumPages = useViewerStore((s) => s.setNumPages);
  const setPageNumber = useViewerStore((s) => s.setPageNumber);
  const setScale = useViewerStore((s) => s.setScale);
  const setFitMode = useViewerStore((s) => s.setFitMode);
  const rotateClockwise = useViewerStore((s) => s.rotateClockwise);
  const setViewMode = useViewerStore((s) => s.setViewMode);
  const setHighlightCount = useViewerStore((s) => s.setHighlightCount);
  const setHighlightCursor = useViewerStore((s) => s.setHighlightCursor);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const cycleTheme = useViewerStore((s) => s.cycleTheme);
  const openSearch = useViewerStore((s) => s.openSearch);
  const resetView = useViewerStore((s) => s.resetView);

  const viewerRef = useRef<HTMLElement | null>(null);
  const viewerSize = useElementSize(viewerRef);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isNarrow = useMediaQuery("(max-width: 860px)");
  const isXs = useMediaQuery("(max-width: 560px)");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkService] = useState(
    () =>
      new MinimalLinkService({
        doc: null,
        setPage: (n) => useViewerStore.getState().setPageNumber(n),
        getPage: () => useViewerStore.getState().pageNumber,
        getRotation: () => useViewerStore.getState().rotation
      })
  );

  const title = useMemo(() => sourceName(source), [source]);

  // ── Loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setSizes([]);
    setLoadError(null);
    linkService.setDocument(null);
    if (source.kind === "none") {
      setIsLoading(false);
      setNumPages(0);
      return;
    }
    setIsLoading(true);
    loadPdf(source)
      .then((loaded) => {
        if (cancelled) {
          void loaded?.destroy?.();
          return;
        }
        setDoc(loaded);
        linkService.setDocument(loaded);
        setNumPages(loaded?.numPages ?? 0);
      })
      .catch((e) => {
        if (cancelled) return;
        setNumPages(0);
        setLoadError(describeLoadError(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, setNumPages, linkService]);

  // Free the worker-side copy of a document once we stop showing it.
  useEffect(() => () => void doc?.destroy?.(), [doc]);

  // Page sizes drive layout before anything is rendered. Assume every page
  // matches page 1, then correct in the background for mixed-size documents.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      const first = (await doc.getPage(1)).getViewport({ scale: 1 });
      if (cancelled) return;
      const out: PageSize[] = Array.from({ length: doc.numPages }, () => ({ width: first.width, height: first.height }));
      setSizes(out.slice());
      for (let i = 2; i <= doc.numPages; i++) {
        const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
        if (cancelled) return;
        if (vp.width !== first.width || vp.height !== first.height) out[i - 1] = { width: vp.width, height: vp.height };
        if (i % 50 === 0 || i === doc.numPages) setSizes(out.slice());
      }
    })().catch((e) => console.warn("Couldn't read page sizes", e));
    return () => {
      cancelled = true;
    };
  }, [doc]);

  useEffect(() => {
    document.title = title ? `${title} – pdfViewer` : "pdfViewer";
  }, [title]);

  // ── Zoom ───────────────────────────────────────────────────────────────
  const fitScale = useMemo(() => {
    if (fitMode === "free" || !viewerSize || !sizes.length) return null;
    const size = sizes[clamp(pageNumber, 1, sizes.length) - 1]!;
    const sideways = rotation % 180 !== 0;
    const pageW = sideways ? size.height : size.width;
    const pageH = sideways ? size.width : size.height;
    const padding = isXs ? 24 : 48;
    const byWidth = (viewerSize.width - padding) / pageW;
    const byPage = Math.min(byWidth, (viewerSize.height - padding) / pageH);
    const fit = fitMode === "width" ? byWidth : fitMode === "page" ? byPage : pageW > pageH ? byPage : Math.min(1.25, byWidth);
    return clampScale(Math.floor(fit * 100) / 100);
  }, [fitMode, viewerSize, sizes, pageNumber, rotation, isXs]);

  const effectiveScale = fitScale ?? scale;
  const effectiveScaleRef = useRef(effectiveScale);
  effectiveScaleRef.current = effectiveScale;

  const zoomStep = useCallback((dir: 1 | -1) => setScale(nextZoom(effectiveScaleRef.current, dir)), [setScale]);

  const onZoomSelect = useCallback(
    (value: string) => {
      if (value === "auto" || value === "page" || value === "width") setFitMode(value);
      else if (Number(value)) setScale(Number(value) / 100);
    },
    [setFitMode, setScale]
  );

  // Ctrl/⌘ + wheel (and trackpad pinch, which reports as ctrl+wheel) zooms the document.
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !useViewerStore.getState().numPages) return;
      e.preventDefault();
      setScale(effectiveScaleRef.current * Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setScale]);

  // ── Opening files ──────────────────────────────────────────────────────
  const openFile = useCallback(
    async (file: File) => {
      if (!isPdfFile(file)) {
        setNotice(`“${file.name}” isn’t a PDF.`);
        return;
      }
      setSource({ kind: "file", name: file.name, data: await file.arrayBuffer() });
      setDrawerOpen(false);
    },
    [setSource]
  );

  const openPicker = useCallback(() => fileInputRef.current?.click(), []);
  const openSample = useCallback(() => setSource({ kind: "url", url: SAMPLE_URL }), [setSource]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [notice]);

  // Drag a file anywhere onto the window.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setIsDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void openFile(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [openFile]);

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "o") {
        e.preventDefault();
        openPicker();
        return;
      }
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
        return;
      }
      const state = useViewerStore.getState();
      if (!state.numPages) return;

      if (mod && key === "f") {
        e.preventDefault();
        if (isNarrow) setDrawerOpen(true);
        openSearch();
        return;
      }
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomStep(1);
        return;
      }
      if (mod && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        zoomStep(-1);
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        resetView();
        return;
      }
      if (mod || e.altKey || isTypingTarget(e.target)) return;

      const go = (n: number) => {
        e.preventDefault();
        state.setPageNumber(n);
      };
      const single = state.viewMode === "single";
      switch (e.key) {
        case "ArrowLeft":
          return go(state.pageNumber - 1);
        case "ArrowRight":
          return go(state.pageNumber + 1);
        case "PageUp":
          if (single) go(state.pageNumber - 1);
          return;
        case "PageDown":
          if (single) go(state.pageNumber + 1);
          return;
        case "Home":
          return go(1);
        case "End":
          return go(state.numPages);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, isNarrow, openPicker, openSearch, resetView, zoomStep]);

  // ── Search highlights ──────────────────────────────────────────────────
  const scrolledForNonce = useRef(0);
  const syncHighlights = useCallback(() => {
    const root = viewerRef.current;
    if (!root) return;
    const s = useViewerStore.getState();
    const pageEl = root.querySelector(`[data-page="${s.pageNumber}"]`);
    const marks = pageEl ? Array.from(pageEl.querySelectorAll<HTMLElement>(".textLayer mark.hl")) : [];
    if (s.highlightCount !== marks.length) setHighlightCount(marks.length);
    const cursor = marks.length ? clamp(s.highlightCursor, 0, marks.length - 1) : 0;
    if (marks.length && cursor !== s.highlightCursor) setHighlightCursor(cursor);
    root.querySelectorAll(".hl--active").forEach((m) => m.classList.remove("hl--active"));
    const active = marks[cursor];
    if (!active) return;
    active.classList.add("hl--active");
    if (s.highlightScrollNonce !== scrolledForNonce.current) {
      scrolledForNonce.current = s.highlightScrollNonce;
      active.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [setHighlightCount, setHighlightCursor]);

  useEffect(() => syncHighlights(), [syncHighlights, pageNumber, highlightCursor, highlightQuery, highlightScrollNonce]);

  const onPageRendered = useCallback(
    (n: number) => {
      if (n === useViewerStore.getState().pageNumber) syncHighlights();
    },
    [syncHighlights]
  );

  // ── Layout ─────────────────────────────────────────────────────────────
  const sidebarVisible = isNarrow ? drawerOpen : isSidebarOpen;
  const selectPage = useCallback(
    (n: number) => {
      setPageNumber(n);
      if (isNarrow) setDrawerOpen(false);
    },
    [isNarrow, setPageNumber]
  );

  let content: React.ReactNode;
  if (loadError) content = <ErrorState message={loadError} onOpen={openPicker} />;
  else if (source.kind === "none") content = <EmptyState onOpen={openPicker} onSample={openSample} />;
  else if (isLoading || !doc || !sizes.length) content = <LoadingState />;
  else
    content = (
      <DocumentView
        doc={doc}
        sizes={sizes}
        viewMode={viewMode}
        pageNumber={pageNumber}
        scale={effectiveScale}
        rotation={rotation}
        highlightQuery={highlightQuery}
        linkService={linkService}
        scrollRef={viewerRef}
        onActivePage={setPageNumber}
        onPageRendered={onPageRendered}
      />
    );

  return (
    <div className="app">
      <Toolbar
        title={title}
        hasDoc={!!doc}
        pageNumber={pageNumber}
        numPages={numPages}
        scale={effectiveScale}
        fitMode={fitMode}
        viewMode={viewMode}
        theme={theme}
        sidebarOpen={sidebarVisible}
        onToggleSidebar={isNarrow ? () => setDrawerOpen((v) => !v) : toggleSidebar}
        onPage={setPageNumber}
        onZoomStep={zoomStep}
        onZoomSelect={onZoomSelect}
        onToggleViewMode={() => setViewMode(viewMode === "scroll" ? "single" : "scroll")}
        onRotate={rotateClockwise}
        onCycleTheme={cycleTheme}
        onOpen={openPicker}
      />

      <div className={`body ${sidebarVisible && !isNarrow ? "body--sidebar" : ""}`}>
        {sidebarVisible && isNarrow ? <div className="scrim" onClick={() => setDrawerOpen(false)} /> : null}
        {sidebarVisible ? <Sidebar doc={doc} onSelectPage={selectPage} drawer={isNarrow} /> : null}
        <main className={`viewer viewer--${viewMode}`} ref={viewerRef} aria-label="Document">
          {content}
        </main>
      </div>

      {isDragging ? (
        <div className="dropOverlay" aria-hidden="true">
          <span>Drop to open</span>
        </div>
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          {notice}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
