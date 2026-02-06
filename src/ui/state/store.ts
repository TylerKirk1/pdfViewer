import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "../theme/theme";

export type PdfSource =
  | { kind: "none" }
  | { kind: "file"; name: string; data: ArrayBuffer }
  | { kind: "url"; url: string };

export type ViewerState = {
  source: PdfSource;
  pageNumber: number;
  numPages: number;
  scale: number;
  rotation: 0 | 90 | 180 | 270;
  viewMode: "single" | "scroll";
  fitMode: "free" | "width" | "page";
  highlightQuery: string;
  highlightCursor: number;
  highlightCount: number;
  highlightScrollNonce: number;
  theme: Theme;
  isSidebarOpen: boolean;
  sidebarTab: "thumbs" | "outline" | "search";
  setSource: (s: PdfSource) => void;
  setPageNumber: (n: number) => void;
  setNumPages: (n: number) => void;
  setScale: (n: number) => void;
  setRotation: (r: ViewerState["rotation"]) => void;
  setViewMode: (m: ViewerState["viewMode"]) => void;
  setFitMode: (m: ViewerState["fitMode"]) => void;
  setHighlightQuery: (q: string) => void;
  setHighlightCursor: (n: number) => void;
  setHighlightCount: (n: number) => void;
  bumpHighlightScrollNonce: () => void;
  toggleSidebar: () => void;
  setSidebarTab: (t: ViewerState["sidebarTab"]) => void;
  setTheme: (t: Theme) => void;
  resetView: () => void;
};

const defaultTheme: Theme = {
  accent: "#2A6BFF",
  surface: "#0F172A",
  background: "#0B1220",
  text: "#E6EEF8",
  mutedText: "#9BB0CA",
  panel: "#0C162A",
  border: "rgba(255,255,255,0.10)"
};

export const useViewerStore = create<ViewerState>()(
  persist(
    (set, get) => ({
      source: { kind: "none" },
      pageNumber: 1,
      numPages: 0,
      scale: 1.1,
      rotation: 0,
      viewMode: "single",
      fitMode: "free",
      highlightQuery: "",
      highlightCursor: 0,
      highlightCount: 0,
      highlightScrollNonce: 0,
      theme: defaultTheme,
      isSidebarOpen: true,
      sidebarTab: "thumbs",
      setSource: (source) =>
        set(() => ({
          source,
          pageNumber: 1,
          numPages: 0,
          viewMode: "single",
          fitMode: "free",
          highlightQuery: "",
          highlightCursor: 0,
          highlightCount: 0,
          highlightScrollNonce: 0
        })),
      setPageNumber: (pageNumber) => set(() => ({ pageNumber })),
      setNumPages: (numPages) =>
        set(() => ({
          numPages,
          pageNumber: Math.min(get().pageNumber, Math.max(1, numPages))
        })),
      setScale: (scale) => set(() => ({ scale, fitMode: "free" })),
      setRotation: (rotation) => set(() => ({ rotation })),
      setViewMode: (viewMode) => set(() => ({ viewMode })),
      setFitMode: (fitMode) => set(() => ({ fitMode })),
      setHighlightQuery: (highlightQuery) =>
        set(() => ({
          highlightQuery,
          highlightCursor: 0,
          highlightCount: 0,
          highlightScrollNonce: 0
        })),
      setHighlightCursor: (highlightCursor) => set(() => ({ highlightCursor })),
      setHighlightCount: (highlightCount) => set(() => ({ highlightCount })),
      bumpHighlightScrollNonce: () => set((s) => ({ highlightScrollNonce: s.highlightScrollNonce + 1 })),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      setSidebarTab: (sidebarTab) => set(() => ({ sidebarTab })),
      setTheme: (theme) => set(() => ({ theme })),
      resetView: () =>
        set(() => ({
          scale: 1.1,
          rotation: 0,
          fitMode: "free",
          highlightQuery: "",
          highlightCursor: 0,
          highlightCount: 0,
          highlightScrollNonce: 0
        }))
    }),
    {
      name: "pdfviewer:state:v1",
      partialize: (s) => ({
        // Keep it minimal: theme + layout prefs only.
        theme: s.theme,
        isSidebarOpen: s.isSidebarOpen,
        sidebarTab: s.sidebarTab,
        viewMode: s.viewMode
      })
    }
  )
);
