import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerShell } from "../ViewerShell";
import { useViewerStore } from "../state/store";

vi.mock("../pdf/loadPdf", () => ({
  loadPdf: vi.fn()
}));

vi.mock("../pdf/renderPage", () => ({
  renderPage: vi.fn(async () => {})
}));

import { loadPdf } from "../pdf/loadPdf";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadPdfMock: any = loadPdf;

function resetStore() {
  localStorage.removeItem("pdfviewer:state:v1");
  useViewerStore.setState({
    source: { kind: "none" },
    pageNumber: 1,
    numPages: 0,
    scale: 1.1,
    rotation: 0,
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
    sidebarTab: "thumbs"
  });
}

function makeDoc(pagesText: string[]) {
  return {
    numPages: pagesText.length,
    getPage: async (n: number) => {
      const text = pagesText[n - 1] ?? "";
      return {
        getTextContent: async () => ({
          items: text.split(/\s+/).filter(Boolean).map((str) => ({ str }))
        }),
        getViewport: ({ scale }: { scale: number; rotation: number }) => ({
          width: 600 * scale,
          height: 800 * scale
        }),
        render: () => ({ promise: Promise.resolve() })
      };
    },
    getOutline: async () => null
  };
}

describe("ViewerShell", () => {
  beforeEach(() => resetStore());

  it("navigates pages with next/prev buttons", async () => {
    loadPdfMock.mockResolvedValue(makeDoc(["hello page one", "hello page two", "third page"]));
    useViewerStore.getState().setSource({ kind: "url", url: "https://example.com/a.pdf" });

    render(<ViewerShell />);

    await waitFor(() => expect(screen.getByLabelText("Next page")).toBeEnabled());
    const input = screen.getByLabelText("Page number") as HTMLInputElement;
    expect(input.value).toBe("1");

    await userEvent.click(screen.getByLabelText("Next page"));
    expect(input.value).toBe("2");

    await userEvent.click(screen.getByLabelText("Previous page"));
    expect(input.value).toBe("1");
  });

  it("searches and jumps to a result page", async () => {
    loadPdfMock.mockResolvedValue(makeDoc(["alpha beta", "needle is here", "omega"]));
    useViewerStore.getState().setSource({ kind: "url", url: "https://example.com/b.pdf" });
    useViewerStore.getState().setSidebarTab("search");

    render(<ViewerShell />);

    await waitFor(() => expect(screen.getByLabelText("Next page")).toBeEnabled());

    const q = screen.getByLabelText("Search query");
    await userEvent.type(q, "needle");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByText(/Page 2/)).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Page 2/));

    const input = screen.getByLabelText("Page number") as HTMLInputElement;
    expect(input.value).toBe("2");
  });
});
