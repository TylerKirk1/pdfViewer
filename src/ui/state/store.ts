import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeMode } from "../theme/theme";

export type PdfSource =
  | { kind: "none" }
  | { kind: "file"; name: string; data: ArrayBuffer }
  | { kind: "url"; url: string };

export type Rotation = 0 | 90 | 180 | 270;
export type ViewMode = "single" | "scroll";
/** "free" means the user picked an explicit zoom level; the others are computed from the viewport. */
export type FitMode = "free" | "auto" | "width" | "page";
export type SidebarTab = "thumbs" | "outline" | "search";

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Next zoom level in the given direction, snapping to the familiar steps. */
export function nextZoom(current: number, dir: 1 | -1) {
  if (dir > 0) return ZOOM_STEPS.find((s) => s > current + 0.001) ?? MAX_SCALE;
  return [...ZOOM_STEPS].reverse().find((s) => s < current - 0.001) ?? MIN_SCALE;
}

export type ViewerState = {
  source: PdfSource;
  pageNumber: number;
  numPages: number;
  scale: number;
  fitMode: FitMode;
  rotation: Rotation;
  viewMode: ViewMode;
  highlightQuery: string;
  highlightCursor: number;
  highlightCount: number;
  /** Bumped whenever the active search match should be scrolled into view. Never reset. */
  highlightScrollNonce: number;
  /** Bumped to ask the search panel to focus its input (Ctrl+F). */
  searchFocusNonce: number;
  theme: ThemeMode;
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
  setSource: (s: PdfSource) => void;
  setPageNumber: (n: number) => void;
  setNumPages: (n: number) => void;
  setScale: (n: number) => void;
  setFitMode: (m: FitMode) => void;
  setRotation: (r: Rotation) => void;
  rotateClockwise: () => void;
  setViewMode: (m: ViewMode) => void;
  setHighlightQuery: (q: string) => void;
  setHighlightCursor: (n: number) => void;
  setHighlightCount: (n: number) => void;
  bumpHighlightScrollNonce: () => void;
  openSearch: () => void;
  toggleSidebar: () => void;
  setSidebarTab: (t: SidebarTab) => void;
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
  resetView: () => void;
};

export const useViewerStore = create<ViewerState>()(
  persist(
    (set, get) => ({
      source: { kind: "none" },
      pageNumber: 1,
      numPages: 0,
      scale: 1,
      fitMode: "auto",
      rotation: 0,
      viewMode: "scroll",
      highlightQuery: "",
      highlightCursor: 0,
      highlightCount: 0,
      highlightScrollNonce: 0,
      searchFocusNonce: 0,
      theme: "system",
      isSidebarOpen: true,
      sidebarTab: "thumbs",
      setSource: (source) =>
        set(() => ({
          source,
          pageNumber: 1,
          numPages: 0,
          fitMode: "auto",
          rotation: 0,
          highlightQuery: "",
          highlightCursor: 0,
          highlightCount: 0
        })),
      setPageNumber: (n) => {
        const { numPages } = get();
        const max = Math.max(1, numPages);
        set(() => ({ pageNumber: Math.min(max, Math.max(1, Math.round(n) || 1)) }));
      },
      setNumPages: (numPages) =>
        set(() => ({
          numPages,
          pageNumber: Math.min(get().pageNumber, Math.max(1, numPages))
        })),
      setScale: (scale) => set(() => ({ scale: clampScale(scale), fitMode: "free" })),
      setFitMode: (fitMode) => set(() => ({ fitMode })),
      setRotation: (rotation) => set(() => ({ rotation })),
      rotateClockwise: () => set((s) => ({ rotation: ((s.rotation + 90) % 360) as Rotation })),
      setViewMode: (viewMode) => set(() => ({ viewMode })),
      setHighlightQuery: (highlightQuery) => set(() => ({ highlightQuery, highlightCursor: 0, highlightCount: 0 })),
      setHighlightCursor: (highlightCursor) => set(() => ({ highlightCursor })),
      setHighlightCount: (highlightCount) => set(() => ({ highlightCount })),
      bumpHighlightScrollNonce: () => set((s) => ({ highlightScrollNonce: s.highlightScrollNonce + 1 })),
      openSearch: () =>
        set((s) => ({ isSidebarOpen: true, sidebarTab: "search", searchFocusNonce: s.searchFocusNonce + 1 })),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      setSidebarTab: (sidebarTab) => set(() => ({ sidebarTab })),
      setTheme: (theme) => set(() => ({ theme })),
      cycleTheme: () =>
        set((s) => ({ theme: s.theme === "system" ? "light" : s.theme === "light" ? "dark" : "system" })),
      resetView: () => set(() => ({ scale: 1, fitMode: "auto", rotation: 0 }))
    }),
    {
      name: "pdfviewer:prefs:v2",
      partialize: (s) => ({
        theme: s.theme,
        isSidebarOpen: s.isSidebarOpen,
        sidebarTab: s.sidebarTab,
        viewMode: s.viewMode
      })
    }
  )
);
