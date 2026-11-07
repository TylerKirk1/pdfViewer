import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useOnScreen } from "../../hooks/useOnScreen";

type Props = {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  onSelectPage: (n: number) => void;
};

const THUMB_WIDTH = 120;

export function ThumbnailsPanel({ doc, pageNumber, onSelectPage }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pages = useMemo(() => (doc ? Array.from({ length: doc.numPages }, (_, i) => i + 1) : []), [doc]);

  if (!doc) return <p className="panelEmpty">Open a PDF to see its pages.</p>;

  return (
    <div className="thumbs" ref={scrollerRef}>
      {pages.map((n) => (
        <ThumbnailItem key={n} doc={doc} pageNumber={n} isActive={n === pageNumber} onClick={() => onSelectPage(n)} />
      ))}
    </div>
  );
}

function ThumbnailItem(props: { doc: PDFDocumentProxy; pageNumber: number; isActive: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const isVisible = useOnScreen(itemRef, null);
  const rendered = useRef(false);
  const [failed, setFailed] = useState(false);
  const { doc, pageNumber, isActive } = props;

  useEffect(() => {
    if (!isVisible || rendered.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: THUMB_WIDTH / page.getViewport({ scale: 1 }).width });
      const dpr = window.devicePixelRatio || 1;
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.floor(viewport.width * dpr);
      offscreen.height = Math.floor(viewport.height * dpr);
      const ctx = offscreen.getContext("2d", { alpha: false });
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] });
      await task.promise;
      if (cancelled) return;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.getContext("2d")?.drawImage(offscreen, 0, 0);
      rendered.current = true;
    })().catch((e) => {
      if (!cancelled && e?.name !== "RenderingCancelledException") setFailed(true);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [isVisible, doc, pageNumber]);

  // Keep the current page's thumbnail in view while reading.
  useEffect(() => {
    if (isActive) itemRef.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      type="button"
      className={`thumb ${isActive ? "thumb--active" : ""}`}
      onClick={props.onClick}
      aria-label={`Page ${pageNumber}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="thumb__frame">
        <canvas ref={canvasRef} className="thumb__canvas" />
        {failed ? <span className="thumb__error">!</span> : null}
      </span>
      <span className="thumb__label">{pageNumber}</span>
    </button>
  );
}
