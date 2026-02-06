import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPanel } from "../SearchPanel";
import { useViewerStore } from "../../../state/store";

vi.mock("../../../pdf/search", () => ({
  searchDocument: vi.fn(async () => [{ pageNumber: 2, snippet: "needle", matchCount: 1 }])
}));

function resetStore() {
  localStorage.removeItem("pdfviewer:state:v1");
  useViewerStore.setState({
    source: { kind: "none" },
    pageNumber: 1,
    numPages: 3,
    scale: 1.1,
    rotation: 0,
    viewMode: "single",
    fitMode: "free",
    highlightQuery: "",
    highlightCursor: 0,
    highlightCount: 0,
    highlightScrollNonce: 0,
    theme: {
      accent: "#2A6BFF",
      surface: "#0F172A",
      background: "#0B1220",
      text: "#E6EEF8",
      mutedText: "#9BB0CA",
      panel: "#0C162A",
      border: "rgba(255,255,255,0.10)"
    },
    isSidebarOpen: true,
    sidebarTab: "search"
  });
}

describe("SearchPanel", () => {
  beforeEach(() => resetStore());

  it("sets and clears highlight query", async () => {
    const doc = { numPages: 3 } as any;
    const onSelectPage = vi.fn();
    render(<SearchPanel doc={doc} onSelectPage={onSelectPage} />);

    await userEvent.type(screen.getByLabelText("Search query"), "needle");
    await userEvent.keyboard("{Enter}");

    expect(useViewerStore.getState().highlightQuery).toBe("needle");

    await userEvent.click(screen.getByLabelText("Clear search"));
    expect(useViewerStore.getState().highlightQuery).toBe("");
  });

  it("cycles within-page highlight cursor", async () => {
    useViewerStore.setState({ highlightQuery: "x", highlightCount: 3, highlightCursor: 0 });
    const doc = { numPages: 3 } as any;
    render(<SearchPanel doc={doc} onSelectPage={() => {}} />);

    await userEvent.click(screen.getByLabelText("Next match on page"));
    expect(useViewerStore.getState().highlightCursor).toBe(1);

    await userEvent.click(screen.getByLabelText("Previous match on page"));
    expect(useViewerStore.getState().highlightCursor).toBe(0);
  });
});
