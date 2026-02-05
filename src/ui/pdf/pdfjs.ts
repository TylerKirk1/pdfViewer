import * as pdfjsLib from "pdfjs-dist";

// Use the worker shipped by pdfjs-dist and let Vite bundle it.
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?worker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerPort = new pdfWorker();

export { pdfjsLib };

