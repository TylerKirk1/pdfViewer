import type { Theme } from "./theme";

export function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--bg", theme.background);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--muted", theme.mutedText);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--border", theme.border);
}

