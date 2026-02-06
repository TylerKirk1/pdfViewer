// Lazy-load PDF.js so the initial app bundle stays small.
// Vite will split this into a separate chunk.

type PdfjsModule = typeof import("pdfjs-dist");

let cached: PdfjsModule | null = null;
let workerReady = false;

export async function getPdfjs() {
  if (cached) return cached;
  const mod = (await import("pdfjs-dist")) as PdfjsModule;
  cached = mod;

  if (!workerReady && typeof Worker !== "undefined") {
    const { default: PdfWorker } = await import("pdfjs-dist/build/pdf.worker.mjs?worker");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mod as any).GlobalWorkerOptions.workerPort = new PdfWorker();
    workerReady = true;
  }

  return mod;
}

