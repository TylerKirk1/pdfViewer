import React, { useMemo, useState } from "react";
import { useViewerStore } from "../state/store";
import type { Theme } from "./theme";
import { Button } from "../components/Button";

type Props = {
  onClose: () => void;
};

const presets: Array<{ name: string; theme: Theme }> = [
  {
    name: "Electric Blue",
    theme: {
      accent: "#2A6BFF",
      surface: "#0F172A",
      background: "#0B1220",
      text: "#E6EEF8",
      mutedText: "#9BB0CA",
      panel: "#0C162A",
      border: "rgba(255,255,255,0.10)"
    }
  },
  {
    name: "Citrus",
    theme: {
      accent: "#E2FF3A",
      surface: "#12181F",
      background: "#0B0F14",
      text: "#ECF0F4",
      mutedText: "#AAB6C4",
      panel: "#0E151D",
      border: "rgba(255,255,255,0.12)"
    }
  },
  {
    name: "Coral",
    theme: {
      accent: "#FF4D6D",
      surface: "#111827",
      background: "#070B14",
      text: "#F1F5F9",
      mutedText: "#9AA9BF",
      panel: "#0C1424",
      border: "rgba(255,255,255,0.12)"
    }
  }
];

function safeHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;
}

export function ThemePanel({ onClose }: Props) {
  const theme = useViewerStore((s) => s.theme);
  const setTheme = useViewerStore((s) => s.setTheme);

  const [accent, setAccent] = useState(theme.accent);
  const canApply = useMemo(() => safeHex(accent) !== null, [accent]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Theme">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel">
        <div className="modal__header">
          <div className="modal__title">Theme</div>
          <Button onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="modal__section">
          <div className="modal__label">Presets</div>
          <div className="presetRow">
            {presets.map((p) => (
              <button
                key={p.name}
                className="preset"
                onClick={() => {
                  setTheme(p.theme);
                  setAccent(p.theme.accent);
                }}
              >
                <span className="preset__swatch" style={{ background: p.theme.accent }} />
                <span className="preset__name">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal__section">
          <div className="modal__label">Accent color</div>
          <div className="fieldRow">
            <input
              className="field"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Accent hex color"
              placeholder="#2A6BFF"
            />
            <button
              className="apply"
              disabled={!canApply}
              onClick={() => {
                const hex = safeHex(accent);
                if (!hex) return;
                setTheme({ ...theme, accent: hex });
              }}
            >
              Apply
            </button>
          </div>
          <div className="hint">Hex only (example: #2A6BFF).</div>
        </div>

        <div className="modal__footer">
          <Button
            variant="solid"
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(theme, null, 2)).catch(() => {});
            }}
          >
            Copy theme JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

