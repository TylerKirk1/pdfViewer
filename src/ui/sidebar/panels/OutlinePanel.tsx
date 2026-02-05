import React, { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getOutlineSafe, resolveDestToPageNumber, type OutlineNode } from "../../pdf/outline";

type Props = {
  doc: PDFDocumentProxy | null;
  onSelectPage: (n: number) => void;
};

export function OutlinePanel({ doc, onSelectPage }: Props) {
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setOutline([]);
      if (!doc) return;
      const out = await getOutlineSafe(doc);
      if (!cancelled) setOutline(out);
    })().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load outline");
    });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (!doc) {
    return (
      <div className="panelEmpty">
        <div className="panelEmpty__title">Outline</div>
        <div className="panelEmpty__hint">Open a PDF to see the outline.</div>
      </div>
    );
  }

  if (error) return <div className="panelError">{error}</div>;
  if (!outline.length) return <div className="panelEmpty__hint">No outline.</div>;

  return (
    <div className="outline">
      {outline.map((n, idx) => (
        <OutlineItem key={`${idx}:${n.title}`} doc={doc} node={n} depth={0} onSelectPage={onSelectPage} />
      ))}
    </div>
  );
}

function OutlineItem(props: { doc: PDFDocumentProxy; node: OutlineNode; depth: number; onSelectPage: (n: number) => void }) {
  const [resolved, setResolved] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pn = await resolveDestToPageNumber(props.doc, props.node.dest);
      if (!cancelled) setResolved(pn);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.doc, props.node.dest]);

  const canClick = resolved !== null;
  return (
    <div className="outline__item" style={{ paddingLeft: 10 + props.depth * 12 }}>
      <button
        className={`outline__btn ${canClick ? "" : "outline__btn--disabled"}`}
        onClick={() => resolved !== null && props.onSelectPage(resolved)}
        disabled={!canClick}
        title={props.node.title}
      >
        {props.node.title}
        {resolved !== null ? <span className="outline__page">{resolved}</span> : null}
      </button>
      {props.node.items?.length ? (
        <div className="outline__children">
          {props.node.items.map((c, idx) => (
            <OutlineItem key={`${idx}:${c.title}`} doc={props.doc} node={c} depth={props.depth + 1} onSelectPage={props.onSelectPage} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

