import * as pdfjsLib from "pdfjs-dist";

// Use the worker shipped by pdfjs-dist and let Vite bundle it.
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?worker";

// In test/Node environments there is no global `Worker`. The viewer code paths
// are mocked there, so it's safe to skip worker setup.
if (typeof Worker !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjsLib as any).GlobalWorkerOptions.workerPort = new pdfWorker();
}

export { pdfjsLib };
