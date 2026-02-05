import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

export type RenderOpts = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  canvas: HTMLCanvasElement;
  scale: number;
  rotation: number;
  onTextLayer?: (container: HTMLDivElement, page: PDFPageProxy, viewportScale: number) => void;
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

  if (opts.onTextLayer) {
    opts.onTextLayer(document.createElement("div"), page, opts.scale);
  }
}

