import { describe, it, expect, beforeEach } from "vitest";
import { MAX_SCALE, MIN_SCALE, nextZoom, useViewerStore } from "../store";

describe("nextZoom", () => {
  it("snaps to the next familiar step", () => {
    expect(nextZoom(1, 1)).toBe(1.1);
    expect(nextZoom(1, -1)).toBe(0.9);
    expect(nextZoom(1.17, 1)).toBe(1.25);
    expect(nextZoom(1.17, -1)).toBe(1.1);
  });

  it("stops at the limits", () => {
    expect(nextZoom(MAX_SCALE, 1)).toBe(MAX_SCALE);
    expect(nextZoom(MIN_SCALE, -1)).toBe(MIN_SCALE);
  });
});

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
    useViewerStore.setState(useViewerStore.getInitialState(), true);
  });

  it("keeps the page number inside the document", () => {
    const s = useViewerStore.getState();
    s.setNumPages(5);
    s.setPageNumber(9);
    expect(useViewerStore.getState().pageNumber).toBe(5);
    s.setPageNumber(-2);
    expect(useViewerStore.getState().pageNumber).toBe(1);
  });

  it("switches to an explicit zoom when a scale is set", () => {
    useViewerStore.getState().setScale(9);
    expect(useViewerStore.getState()).toMatchObject({ scale: MAX_SCALE, fitMode: "free" });
  });

  it("opens the search tab and asks it to take focus", () => {
    useViewerStore.setState({ isSidebarOpen: false, sidebarTab: "thumbs" });
    useViewerStore.getState().openSearch();
    expect(useViewerStore.getState()).toMatchObject({ isSidebarOpen: true, sidebarTab: "search", searchFocusNonce: 1 });
  });
});
