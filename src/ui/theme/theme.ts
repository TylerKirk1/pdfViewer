export type ThemeMode = "system" | "light" | "dark";

/** "system" follows prefers-color-scheme via CSS; the others pin the palette. */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";
  } else {
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
  }
}
