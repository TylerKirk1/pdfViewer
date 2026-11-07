import React, { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getOutlineSafe, resolveDestToPageNumber, type OutlineNode } from "../../pdf/outline";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
};

export function OutlinePanel({ doc, onSelectPage }: Props) {
  const [outline, setOutline] = useState<OutlineNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setOutline(null);
    if (!doc) return;
    getOutlineSafe(doc)
      .then((out) => !cancelled && setOutline(out))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn’t read the outline."));
    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (!doc) return <p className="panelEmpty">Open a PDF to see its outline.</p>;
  if (error) return <p className="panelEmpty">{error}</p>;
  if (!outline) return <p className="panelEmpty">Loading…</p>;
  if (!outline.length) return <p className="panelEmpty">This document has no outline.</p>;

  return (
    <ul className="outline">
      {outline.map((n, idx) => (
        <OutlineItem key={`${idx}:${n.title}`} doc={doc} node={n} depth={0} onSelectPage={onSelectPage} />
      ))}
    </ul>
  );
}

function OutlineItem(props: { doc: PDFDocumentProxy; node: OutlineNode; depth: number; onSelectPage: (n: number) => void }) {
  const [page, setPage] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveDestToPageNumber(props.doc, props.node.dest)
      .then((pn) => !cancelled && setPage(pn))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.doc, props.node.dest]);

  return (
    <li>
      <button
        type="button"
        className="outline__btn"
        style={{ paddingLeft: 8 + props.depth * 14 }}
        onClick={() => page !== null && props.onSelectPage(page)}
        disabled={page === null}
        title={props.node.title}
      >
        <span className="outline__title">{props.node.title}</span>
        {page !== null ? <span className="outline__page">{page}</span> : null}
      </button>
      {props.node.items?.length ? (
        <ul className="outline">
          {props.node.items.map((c, idx) => (
            <OutlineItem key={`${idx}:${c.title}`} doc={props.doc} node={c} depth={props.depth + 1} onSelectPage={props.onSelectPage} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
