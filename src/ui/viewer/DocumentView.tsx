import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PageView, type PageSize } from "./PageView";
import type { ViewMode } from "../state/store";

type Props = {
  doc: PDFDocumentProxy;
  sizes: PageSize[];
  viewMode: ViewMode;
  pageNumber: number;
  scale: number;
  rotation: number;
  highlightQuery: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkService: any;
  /** The scrolling element that contains the pages. */
  scrollRef: React.RefObject<HTMLElement>;
  onActivePage: (pageNumber: number) => void;
  onPageRendered: (pageNumber: number) => void;
};

const PAGE_GAP = 16;

export function DocumentView(props: Props) {
  return props.viewMode === "single" ? <SingleView {...props} /> : <ScrollView {...props} />;
}

function SingleView(props: Props) {
  const n = Math.min(props.doc.numPages, Math.max(1, props.pageNumber));
  const { scrollRef } = props;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [n, scrollRef]);

  return (
    <div className="pages pages--single">
      <PageView
        doc={props.doc}
        pageNumber={n}
        size={props.sizes[n - 1]!}
        scale={props.scale}
        rotation={props.rotation}
        highlightQuery={props.highlightQuery}
        linkService={props.linkService}
        visible
        onRendered={props.onPageRendered}
      />
    </div>
  );
}

function ScrollView(props: Props) {
  const { scrollRef, onActivePage, pageNumber, scale, rotation, sizes } = props;
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState<ReadonlySet<number>>(() => new Set());
  // The page we last reported to (or received from) the store. Lets us tell
  // "the user scrolled here" apart from "something asked us to go to page N".
  const reportedPage = useRef(0);
  // Where the top of the viewport sits, as page + fraction, to keep the reading
  // position stable when zoom or rotation changes the page heights.
  const anchor = useRef<{ page: number; frac: number } | null>(null);
  const refCallbacks = useMemo(
    () =>
      Array.from({ length: sizes.length }, (_, i) => (el: HTMLDivElement | null) => {
        pageEls.current[i] = el;
      }),
    [sizes.length]
  );

  // Lazily render pages within ~1.5 screens of the viewport.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const n = Number((entry.target as HTMLElement | undefined)?.dataset?.page);
            if (!n) continue;
            if (entry.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        });
      },
      { root, rootMargin: "150% 0px" }
    );
    for (const el of pageEls.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [scrollRef, props.doc, sizes.length]);

  // Track which page is being read: the one under a line 30% down the viewport.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let frame = 0;

    const pageAt = (y: number) => {
      const els = pageEls.current;
      let lo = 0;
      let hi = els.length - 1;
      let found = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const el = els[mid];
        if (el && el.offsetTop <= y) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found;
    };

    const update = () => {
      const top = root.scrollTop;
      const topIdx = pageAt(top);
      const topEl = pageEls.current[topIdx];
      if (topEl) anchor.current = { page: topIdx + 1, frac: (top - topEl.offsetTop) / Math.max(1, topEl.offsetHeight) };

      const current = pageAt(top + root.clientHeight * 0.3) + 1;
      if (current !== reportedPage.current) {
        reportedPage.current = current;
        onActivePage(current);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scrollRef, onActivePage]);

  // Navigation from elsewhere (toolbar, thumbnails, links, search): jump there.
  useLayoutEffect(() => {
    if (pageNumber === reportedPage.current) return;
    const root = scrollRef.current;
    const el = pageEls.current[pageNumber - 1];
    if (!root || !el) return;
    reportedPage.current = pageNumber;
    root.scrollTop = el.offsetTop - PAGE_GAP;
  }, [pageNumber, scrollRef, sizes.length]);

  // Keep the same spot in view across zoom and rotation changes.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const a = anchor.current;
    if (!root || !a) return;
    const el = pageEls.current[a.page - 1];
    if (el) root.scrollTop = el.offsetTop + a.frac * el.offsetHeight;
  }, [scale, rotation, scrollRef]);

  return (
    <div className="pages" style={{ gap: PAGE_GAP }}>
      {sizes.map((size, i) => (
        <PageView
          key={i + 1}
          doc={props.doc}
          pageNumber={i + 1}
          size={size}
          scale={scale}
          rotation={rotation}
          highlightQuery={props.highlightQuery}
          linkService={props.linkService}
          visible={visible.has(i + 1)}
          elRef={refCallbacks[i]}
          onRendered={props.onPageRendered}
        />
      ))}
    </div>
  );
}
