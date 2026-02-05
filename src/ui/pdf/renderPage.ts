import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { pdfjsLib } from "./pdfjs";
import { applyTextHighlights } from "./highlight";

export type RenderOpts = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  textLayer?: HTMLDivElement | null;
  annotationLayer?: HTMLDivElement | null;
  scale: number;
  rotation: number;
  highlightQuery?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationStorage?: any;
  renderForms?: boolean;
  onAfterRender?: (page: PDFPageProxy) => void;
};

export async function renderPage(opts: RenderOpts) {
  const page = await opts.doc.getPage(opts.pageNumber);
  const viewport = page.getViewport({ scale: opts.scale, rotation: opts.rotation });

  const canvas = opts.canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // HiDPI crispness
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;

  if (opts.textLayer) {
    const container = opts.textLayer;
    container.replaceChildren();
    container.style.width = `${Math.floor(viewport.width)}px`;
    container.style.height = `${Math.floor(viewport.height)}px`;

    const textContent = await page.getTextContent();
    // pdfjs-dist exports TextLayer from the main bundle.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TextLayerCtor = (pdfjsLib as any).TextLayer as any;
    if (TextLayerCtor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tl: any = new TextLayerCtor({ textContentSource: textContent, container, viewport });
      await tl.render();
      applyTextHighlights(tl.textDivs ?? [], tl.textContentItemsStr ?? [], opts.highlightQuery ?? "");
    }
  }

  if (opts.annotationLayer) {
    const container = opts.annotationLayer;
    container.replaceChildren();
    container.style.width = `${Math.floor(viewport.width)}px`;
    container.style.height = `${Math.floor(viewport.height)}px`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AnnotationLayerCtor = (pdfjsLib as any).AnnotationLayer as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOMSVGFactoryCtor = (pdfjsLib as any).DOMSVGFactory as any;

    if (AnnotationLayerCtor && DOMSVGFactoryCtor && opts.linkService) {
      const annotations = await page.getAnnotations({ intent: "display" });
      const layer = new AnnotationLayerCtor({
        div: container,
        accessibilityManager: null,
        annotationCanvasMap: null,
        annotationEditorUIManager: null,
        page,
        viewport,
        structTreeLayer: null
      });

      await layer.render({
        viewport,
        div: container,
        annotations,
        page,
        linkService: opts.linkService,
        annotationStorage: opts.annotationStorage,
        renderForms: opts.renderForms ?? true,
        svgFactory: new DOMSVGFactoryCtor()
      });
    }
  }

  opts.onAfterRender?.(page);
}
