import React, { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPage, type RenderHandle, type RenderResult } from "../pdf/renderPage";
import { applyTextHighlights } from "../pdf/highlight";

export type PageSize = { width: number; height: number };

type Props = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  /** Unscaled size of the page including its own /Rotate, used to size the placeholder. */
  size: PageSize;
  scale: number;
  rotation: number;
  highlightQuery: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService: any;
  /** Only visible (or nearly visible) pages hold a bitmap; others are released. */
  visible: boolean;
  elRef?: (el: HTMLDivElement | null) => void;
  onRendered?: (pageNumber: number) => void;
};

// While zooming, wait a beat so a burst of zoom steps triggers one render.
const RERENDER_DELAY_MS = 90;

export const PageView = React.memo(function PageView(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const annotationRef = useRef<HTMLDivElement | null>(null);
  const textInfo = useRef<RenderResult | null>(null);
  const hasBitmap = useRef(false);
  const [failed, setFailed] = useState(false);

  // Read the latest values inside async callbacks without re-triggering renders.
  const highlightRef = useRef(props.highlightQuery);
  highlightRef.current = props.highlightQuery;
  const onRenderedRef = useRef(props.onRendered);
  onRenderedRef.current = props.onRendered;

  const rotated = props.rotation % 180 !== 0;
  const width = Math.floor((rotated ? props.size.height : props.size.width) * props.scale);
  const height = Math.floor((rotated ? props.size.width : props.size.height) * props.scale);

  const { doc, pageNumber, scale, rotation, linkService, visible } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!visible) {
      if (hasBitmap.current) {
        canvas.width = 0;
        canvas.height = 0;
        textRef.current?.replaceChildren();
        annotationRef.current?.replaceChildren();
        textInfo.current = null;
        hasBitmap.current = false;
      }
      return;
    }

    let handle: RenderHandle | null = null;
    const timer = window.setTimeout(
      () => {
        handle = renderPage({
          doc,
          pageNumber,
          canvas,
          textLayer: textRef.current,
          annotationLayer: annotationRef.current,
          scale,
          rotation,
          linkService
        });
        handle.promise
          .then((result) => {
            if (!result) return;
            hasBitmap.current = true;
            textInfo.current = result;
            applyTextHighlights(result.textDivs, result.textStrs, highlightRef.current);
            setFailed(false);
            onRenderedRef.current?.(pageNumber);
          })
          .catch((e) => {
            console.error(`Failed to render page ${pageNumber}`, e);
            setFailed(true);
          });
      },
      hasBitmap.current ? RERENDER_DELAY_MS : 0
    );

    return () => {
      window.clearTimeout(timer);
      handle?.cancel();
    };
  }, [visible, doc, pageNumber, scale, rotation, linkService]);

  // Search highlights only touch the text layer; no need to redraw the page.
  useEffect(() => {
    const info = textInfo.current;
    if (!info) return;
    applyTextHighlights(info.textDivs, info.textStrs, props.highlightQuery);
    onRenderedRef.current?.(pageNumber);
  }, [props.highlightQuery, pageNumber]);

  return (
    <div ref={props.elRef} className="page" data-page={pageNumber} style={{ width, height }} aria-label={`PDF page ${pageNumber}`}>
      <canvas ref={canvasRef} className="page__canvas" />
      <div ref={textRef} className="textLayer" />
      <div ref={annotationRef} className="annotationLayer" />
      {failed ? <div className="page__error">Couldn’t render this page</div> : null}
    </div>
  );
});
