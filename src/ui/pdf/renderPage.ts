import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { getPdfjs } from "./pdfjs";

export type RenderOpts = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  textLayer?: HTMLDivElement | null;
  annotationLayer?: HTMLDivElement | null;
  scale: number;
  /** Extra rotation chosen by the user, added on top of the page's own /Rotate. */
  rotation: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService?: any;
};

export type RenderResult = {
  /** Text layer spans and their source strings, used to (re)apply search highlights. */
  textDivs: HTMLElement[];
  textStrs: string[];
};

export type RenderHandle = {
  /** Resolves with the text layer info, or null if the render was cancelled. */
  promise: Promise<RenderResult | null>;
  cancel: () => void;
};

// Browsers refuse to allocate canvases much larger than this.
const MAX_CANVAS_PIXELS = 16_777_216;

function isCancellation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "RenderingCancelledException";
}

/**
 * Renders one page into `canvas`, plus its text and annotation layers.
 *
 * The bitmap is drawn off-screen first and copied over at the end, so the old
 * page stays visible (stretched by CSS) while zooming instead of flashing blank.
 */
export function renderPage(opts: RenderOpts): RenderHandle {
  let cancelled = false;
  let renderTask: RenderTask | null = null;
  let textLayer: { cancel(): void } | null = null;

  const promise = (async (): Promise<RenderResult | null> => {
    const pdfjsLib = await getPdfjs();
    const page = await opts.doc.getPage(opts.pageNumber);
    if (cancelled) return null;

    const viewport = page.getViewport({ scale: opts.scale, rotation: (page.rotate + opts.rotation) % 360 });

    let ratio = window.devicePixelRatio || 1;
    const pixels = viewport.width * viewport.height * ratio * ratio;
    if (pixels > MAX_CANVAS_PIXELS) ratio *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

    const offscreen = document.createElement("canvas");
    offscreen.width = Math.max(1, Math.floor(viewport.width * ratio));
    offscreen.height = Math.max(1, Math.floor(viewport.height * ratio));
    const ctx = offscreen.getContext("2d", { alpha: false });
    if (!ctx) return null;

    renderTask = page.render({
      canvasContext: ctx,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]
    });
    try {
      await renderTask.promise;
    } catch (e) {
      if (cancelled || isCancellation(e)) return null;
      throw e;
    }
    if (cancelled) return null;

    opts.canvas.width = offscreen.width;
    opts.canvas.height = offscreen.height;
    opts.canvas.getContext("2d")?.drawImage(offscreen, 0, 0);

    const result: RenderResult = { textDivs: [], textStrs: [] };

    if (opts.textLayer) {
      const container = opts.textLayer;
      const textContent = await page.getTextContent();
      if (cancelled) return null;
      container.replaceChildren();
      // pdf.js sizes and positions these layers with calc(var(--scale-factor) * …).
      container.style.setProperty("--scale-factor", String(viewport.scale));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TextLayer = (pdfjsLib as any).TextLayer;
      const tl = new TextLayer({ textContentSource: textContent, container, viewport });
      textLayer = tl;
      try {
        await tl.render();
      } catch (e) {
        if (cancelled) return null;
        throw e;
      }
      if (cancelled) return null;
      result.textDivs = tl.textDivs ?? [];
      result.textStrs = tl.textContentItemsStr ?? [];
    }

    if (opts.annotationLayer && opts.linkService) {
      const container = opts.annotationLayer;
      container.replaceChildren();
      container.style.setProperty("--scale-factor", String(viewport.scale));
      try {
        const annotations = await page.getAnnotations({ intent: "display" });
        if (cancelled) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { AnnotationLayer } = pdfjsLib as any;
        const layer = new AnnotationLayer({
          div: container,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          page,
          viewport,
          structTreeLayer: null
        });
        await layer.render({
          viewport: viewport.clone({ dontFlip: true }),
          div: container,
          annotations,
          page,
          linkService: opts.linkService,
          annotationStorage: opts.doc.annotationStorage,
          renderForms: true
        });
      } catch (e) {
        // Links and forms are a nice-to-have; never fail the whole page over them.
        if (!cancelled) console.warn(`Annotation layer failed on page ${opts.pageNumber}`, e);
      }
    }

    return cancelled ? null : result;
  })();

  return {
    promise,
    cancel() {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    }
  };
}
