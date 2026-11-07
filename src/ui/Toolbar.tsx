import React, { useEffect, useState } from "react";
import { IconButton } from "./components/Button";
import { Icon } from "./components/Icon";
import type { FitMode, ViewMode } from "./state/store";
import type { ThemeMode } from "./theme/theme";

type Props = {
  title: string;
  hasDoc: boolean;
  pageNumber: number;
  numPages: number;
  scale: number;
  fitMode: FitMode;
  viewMode: ViewMode;
  theme: ThemeMode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPage: (n: number) => void;
  onZoomStep: (dir: 1 | -1) => void;
  onZoomSelect: (value: string) => void;
  onToggleViewMode: () => void;
  onRotate: () => void;
  onCycleTheme: () => void;
  onOpen: () => void;
};

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300, 400];
const THEME_ICON = { system: "monitor", light: "sun", dark: "moon" } as const;
const THEME_LABEL = { system: "Theme: match system", light: "Theme: light", dark: "Theme: dark" } as const;

export function Toolbar(p: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <IconButton icon="sidebar" label="Toggle sidebar" pressed={p.sidebarOpen} onClick={p.onToggleSidebar} />
        <span className={`toolbar__title ${p.title ? "" : "toolbar__title--brand"}`} title={p.title || undefined}>
          {p.title || "pdfViewer"}
        </span>
      </div>

      <div className="toolbar__group">
        <IconButton
          icon="chevronLeft"
          label="Previous page"
          disabled={!p.hasDoc || p.pageNumber <= 1}
          onClick={() => p.onPage(p.pageNumber - 1)}
        />
        <PageInput page={p.pageNumber} total={p.numPages} disabled={!p.hasDoc} onCommit={p.onPage} />
        <IconButton
          icon="chevronRight"
          label="Next page"
          disabled={!p.hasDoc || p.pageNumber >= p.numPages}
          onClick={() => p.onPage(p.pageNumber + 1)}
        />
      </div>

      <div className="toolbar__group toolbar__group--end">
        <IconButton className="hideXs" icon="minus" label="Zoom out" disabled={!p.hasDoc} onClick={() => p.onZoomStep(-1)} />
        <ZoomSelect scale={p.scale} fitMode={p.fitMode} disabled={!p.hasDoc} onChange={p.onZoomSelect} />
        <IconButton className="hideXs" icon="plus" label="Zoom in" disabled={!p.hasDoc} onClick={() => p.onZoomStep(1)} />
        <span className="toolbar__sep hideNarrow" />
        <IconButton
          className="hideNarrow"
          icon="scroll"
          label="Continuous scroll"
          pressed={p.viewMode === "scroll"}
          onClick={p.onToggleViewMode}
        />
        <IconButton className="hideNarrow" icon="rotate" label="Rotate clockwise" disabled={!p.hasDoc} onClick={p.onRotate} />
        <IconButton icon={THEME_ICON[p.theme]} label={THEME_LABEL[p.theme]} onClick={p.onCycleTheme} />
        <button type="button" className="btn btn--primary toolbar__open" onClick={p.onOpen} aria-label="Open PDF" title="Open PDF">
          <Icon name="open" size={16} />
          <span className="hideXs">Open</span>
        </button>
      </div>
    </header>
  );
}

function PageInput(props: { page: number; total: number; disabled: boolean; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(props.page));

  useEffect(() => setDraft(String(props.page)), [props.page]);

  function commit() {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || props.total < 1) {
      setDraft(String(props.page));
      return;
    }
    const clamped = Math.min(props.total, Math.max(1, n));
    setDraft(String(clamped));
    if (clamped !== props.page) props.onCommit(clamped);
  }

  return (
    <div className="pageInput">
      <input
        aria-label="Page number"
        inputMode="numeric"
        value={props.disabled ? "" : draft}
        placeholder="–"
        disabled={props.disabled}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(String(props.page));
            e.currentTarget.blur();
          }
        }}
      />
      <span className="pageInput__total">of {props.disabled ? "–" : props.total}</span>
    </div>
  );
}

function ZoomSelect(props: { scale: number; fitMode: FitMode; disabled: boolean; onChange: (v: string) => void }) {
  const pct = Math.round(props.scale * 100);
  const isPreset = props.fitMode === "free" && ZOOM_PRESETS.includes(pct);
  const value = props.fitMode !== "free" ? props.fitMode : isPreset ? String(pct) : "custom";
  const suffix = (mode: FitMode) => (props.fitMode === mode && !props.disabled ? ` · ${pct}%` : "");

  return (
    <select
      className="zoomSelect"
      aria-label="Zoom"
      title="Zoom"
      value={props.disabled ? "auto" : value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
    >
      <option value="auto">Auto{suffix("auto")}</option>
      <option value="page">Fit page{suffix("page")}</option>
      <option value="width">Fit width{suffix("width")}</option>
      <option disabled>──────</option>
      {ZOOM_PRESETS.map((z) => (
        <option key={z} value={z}>
          {z}%
        </option>
      ))}
      {value === "custom" ? (
        <option value="custom" hidden>
          {pct}%
        </option>
      ) : null}
    </select>
  );
}
