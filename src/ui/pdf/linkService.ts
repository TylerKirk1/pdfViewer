import type { PDFDocumentProxy } from "pdfjs-dist";

export class MinimalLinkService {
  #doc: PDFDocumentProxy | null;
  #setPage: (n: number) => void;
  #getPage: () => number;
  #getRotation: () => number;

  externalLinkEnabled = true;
  isInPresentationMode = false;

  constructor(opts: {
    doc: PDFDocumentProxy | null;
    setPage: (n: number) => void;
    getPage: () => number;
    getRotation: () => number;
  }) {
    this.#doc = opts.doc;
    this.#setPage = opts.setPage;
    this.#getPage = opts.getPage;
    this.#getRotation = opts.getRotation;
  }

  setDocument(doc: PDFDocumentProxy | null) {
    this.#doc = doc;
  }

  get pagesCount() {
    return this.#doc?.numPages ?? 0;
  }

  set page(value: number) {
    this.#setPage(value);
  }
  get page() {
    return this.#getPage();
  }

  set rotation(_value: number) {
    // Viewer controls rotation itself.
  }
  get rotation() {
    return this.#getRotation();
  }

  async goToDestination(dest: string | any[]) {
    const doc = this.#doc;
    if (!doc) return;
    try {
      const resolved = typeof dest === "string" ? await doc.getDestination(dest) : dest;
      if (!Array.isArray(resolved)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idx = await doc.getPageIndex(resolved[0] as any);
      this.#setPage(idx + 1);
    } catch {
      // ignore
    }
  }

  goToPage(val: number | string) {
    const n = typeof val === "string" ? Number(val) : val;
    if (!Number.isFinite(n)) return;
    this.#setPage(n);
  }

  addLinkAttributes(link: HTMLAnchorElement, url: string, newWindow = true) {
    link.href = url;
    if (newWindow) link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  getDestinationHash(_dest: any) {
    return "";
  }

  getAnchorUrl(hash: any) {
    if (typeof hash === "string") return hash;
    return "";
  }

  setHash(hash: string) {
    // Support #page=5 for basic internal navigation.
    const m = /page=(\d+)/.exec(hash);
    if (m) this.goToPage(Number(m[1]));
  }

  executeNamedAction(_action: string) {
    // noop
  }

  executeSetOCGState(_action: Object) {
    // noop
  }
}

