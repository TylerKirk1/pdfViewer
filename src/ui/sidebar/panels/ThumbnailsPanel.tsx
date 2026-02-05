import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useOnScreen } from "../../hooks/useOnScreen";

type Props = {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  onSelectPage: (n: number) => void;
};

type ThumbState = "idle" | "rendering" | "ready" | "error";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function ThumbnailsPanel({ doc, pageNumber, onSelectPage }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pages = useMemo(() => {
    if (!doc) return [];
    return Array.from({ length: doc.numPages }, (_, i) => i + 1);
  }, [doc]);

  if (!doc) {
    return (
      <div className="panelEmpty">
        <div className="panelEmpty__title">Pages</div>
        <div className="panelEmpty__hint">Open a PDF to see thumbnails.</div>
      </div>
    );
  }

  return (
    <div className="thumbs" ref={scrollerRef}>
      {pages.map((n) => (
        <ThumbnailItem
          key={n}
          root={scrollerRef.current}
          doc={doc}
          pageNumber={n}
          isActive={n === pageNumber}
          onClick={() => onSelectPage(clamp(n, 1, doc.numPages))}
        />
      ))}
    </div>
  );
}

function ThumbnailItem(props: {
  root: Element | null;
  doc: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const isVisible = useOnScreen(itemRef, props.root);
  const [state, setState] = useState<ThumbState>("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isVisible) return;
      if (state !== "idle") return;
      setState("rendering");
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const page = await props.doc.getPage(props.pageNumber);
        const viewport = page.getViewport({ scale: 1, rotation: 0 });
        const targetW = 180;
        const scale = targetW / viewport.width;
        const v = page.getViewport({ scale, rotation: 0 });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(v.width * dpr);
        canvas.height = Math.floor(v.height * dpr);
        canvas.style.width = `${Math.floor(v.width)}px`;
        canvas.style.height = `${Math.floor(v.height)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const task = page.render({ canvasContext: ctx, viewport: v });
        await task.promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVisible, props.doc, props.pageNumber, state]);

  return (
    <button
      ref={itemRef}
      className={`thumb ${props.isActive ? "thumb--active" : ""}`}
      onClick={props.onClick}
      aria-label={`Page ${props.pageNumber}`}
    >
      <div className="thumb__frame">
        <canvas ref={canvasRef} className="thumb__canvas" />
        {state === "rendering" ? <div className="thumb__badge">…</div> : null}
        {state === "error" ? <div className="thumb__badge">!</div> : null}
      </div>
      <div className="thumb__label">{props.pageNumber}</div>
    </button>
  );
}

