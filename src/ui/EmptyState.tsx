import React from "react";
import { Button } from "./components/Button";
import { Icon } from "./components/Icon";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? "⌘" : "Ctrl";

export function EmptyState(props: { onOpen: () => void; onSample: () => void }) {
  return (
    <div className="state">
      <div className="state__inner">
        <span className="state__icon">
          <Icon name="file" size={40} />
        </span>
        <h1>Open a PDF</h1>
        <p>Drop a file anywhere in this window, or choose one from your computer. Files are read locally and never uploaded.</p>
        <div className="state__actions">
          <Button variant="primary" onClick={props.onOpen}>
            Choose file
          </Button>
          <Button onClick={props.onSample}>Try a sample</Button>
        </div>
        <dl className="state__keys">
          <dt>
            <kbd>{MOD}</kbd> <kbd>O</kbd>
          </dt>
          <dd>Open a file</dd>
          <dt>
            <kbd>{MOD}</kbd> <kbd>F</kbd>
          </dt>
          <dd>Search</dd>
          <dt>
            <kbd>←</kbd> <kbd>→</kbd>
          </dt>
          <dd>Previous / next page</dd>
          <dt>
            <kbd>{MOD}</kbd> <kbd>+</kbd> <kbd>−</kbd>
          </dt>
          <dd>Zoom</dd>
        </dl>
      </div>
    </div>
  );
}

export function ErrorState(props: { message: string; onOpen: () => void }) {
  return (
    <div className="state" role="alert">
      <div className="state__inner">
        <span className="state__icon">
          <Icon name="alert" size={36} />
        </span>
        <h1>Couldn’t open this file</h1>
        <p>{props.message}</p>
        <div className="state__actions">
          <Button variant="primary" onClick={props.onOpen}>
            Open another file
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="state" aria-live="polite">
      <p className="state__loading">Loading…</p>
    </div>
  );
}
