import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPanel } from "../SearchPanel";
import { useViewerStore } from "../../../state/store";

vi.mock("../../../pdf/search", () => ({
  searchDocument: vi.fn()
}));

import { searchDocument } from "../../../pdf/search";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const searchMock: any = searchDocument;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const doc = { numPages: 3 } as any;

describe("SearchPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    useViewerStore.setState(useViewerStore.getInitialState(), true);
    useViewerStore.setState({ numPages: 3, sidebarTab: "search" });
    searchMock.mockResolvedValue([
      { pageNumber: 2, snippet: "a needle here", matchCount: 1 },
      { pageNumber: 3, snippet: "two needle needle", matchCount: 2 }
    ]);
  });

  it("sets and clears the highlight query", async () => {
    render(<SearchPanel doc={doc} onSelectPage={() => {}} />);

    await userEvent.type(screen.getByLabelText("Search query"), "needle{Enter}");
    expect(useViewerStore.getState().highlightQuery).toBe("needle");
    await waitFor(() => expect(screen.getByText("Page 3")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Clear search"));
    expect(useViewerStore.getState().highlightQuery).toBe("");
    expect(screen.queryByText("Page 3")).not.toBeInTheDocument();
  });

  it("jumps to the first result at or after the current page", async () => {
    const onSelectPage = vi.fn();
    render(<SearchPanel doc={doc} onSelectPage={onSelectPage} />);
    await userEvent.type(screen.getByLabelText("Search query"), "needle{Enter}");
    await waitFor(() => expect(onSelectPage).toHaveBeenCalledWith(2));
  });

  it("steps through matches on the page, then on to the next page", async () => {
    const onSelectPage = vi.fn((n: number) => useViewerStore.setState({ pageNumber: n }));
    render(<SearchPanel doc={doc} onSelectPage={onSelectPage} />);
    await userEvent.type(screen.getByLabelText("Search query"), "needle{Enter}");
    await waitFor(() => expect(useViewerStore.getState().pageNumber).toBe(2));

    // The viewer reports one highlighted match on page 2.
    useViewerStore.setState({ highlightCount: 1 });
    await userEvent.click(screen.getByLabelText("Next match"));
    expect(useViewerStore.getState().pageNumber).toBe(3);
    expect(useViewerStore.getState().highlightCursor).toBe(0);

    // Going back from the first match on page 3 lands on the last match of page 2.
    useViewerStore.setState({ highlightCount: 2 });
    await userEvent.click(screen.getByLabelText("Previous match"));
    expect(useViewerStore.getState().pageNumber).toBe(2);
  });

  it("cycles within a page when there is no result list", async () => {
    useViewerStore.setState({ highlightQuery: "x", highlightCount: 3, highlightCursor: 0 });
    render(<SearchPanel doc={doc} onSelectPage={() => {}} />);

    await userEvent.click(screen.getByLabelText("Next match"));
    expect(useViewerStore.getState().highlightCursor).toBe(1);

    await userEvent.click(screen.getByLabelText("Previous match"));
    expect(useViewerStore.getState().highlightCursor).toBe(0);
  });
});
