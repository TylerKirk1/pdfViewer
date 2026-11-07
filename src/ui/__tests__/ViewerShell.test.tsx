import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewerShell } from "../ViewerShell";
import { useViewerStore } from "../state/store";

vi.mock("../pdf/loadPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../pdf/loadPdf")>()),
  loadPdf: vi.fn()
}));

vi.mock("../pdf/renderPage", () => ({
  renderPage: vi.fn()
}));

import { loadPdf } from "../pdf/loadPdf";
import { renderPage } from "../pdf/renderPage";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadPdfMock: any = loadPdf;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPageMock: any = renderPage;

function makeDoc(pagesText: string[]) {
  return {
    numPages: pagesText.length,
    getPage: async (n: number) => {
      const text = pagesText[n - 1] ?? "";
      return {
        rotate: 0,
        getTextContent: async () => ({
          items: text.split(/\s+/).filter(Boolean).map((str) => ({ str }))
        }),
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
        render: () => ({ promise: Promise.resolve(), cancel() {} })
      };
    },
    getOutline: async () => null,
    destroy: async () => {}
  };
}

async function openDoc(pagesText: string[]) {
  loadPdfMock.mockResolvedValue(makeDoc(pagesText));
  useViewerStore.getState().setSource({ kind: "url", url: "https://example.com/doc.pdf" });
  render(<ViewerShell />);
  await waitFor(() => expect(screen.getByLabelText("PDF page 1")).toBeInTheDocument());
}

const pageInput = () => screen.getByLabelText("Page number") as HTMLInputElement;

describe("ViewerShell", () => {
  beforeEach(() => {
    localStorage.clear();
    useViewerStore.setState(useViewerStore.getInitialState(), true);
    renderPageMock.mockImplementation(() => ({ promise: Promise.resolve(null), cancel() {} }));
  });

  it("shows the start screen and can open the bundled sample", async () => {
    render(<ViewerShell />);
    expect(screen.getByRole("heading", { name: "Open a PDF" })).toBeInTheDocument();
    loadPdfMock.mockResolvedValue(makeDoc(["sample"]));
    await userEvent.click(screen.getByRole("button", { name: "Try a sample" }));
    const source = useViewerStore.getState().source;
    expect(source.kind === "url" && source.url.endsWith("sample.pdf")).toBe(true);
  });

  it("navigates pages with next/prev buttons", async () => {
    await openDoc(["hello page one", "hello page two", "third page"]);
    expect(pageInput().value).toBe("1");

    await userEvent.click(screen.getByLabelText("Next page"));
    expect(pageInput().value).toBe("2");

    await userEvent.click(screen.getByLabelText("Previous page"));
    expect(pageInput().value).toBe("1");
  });

  it("commits the page box on Enter and reverts junk on blur", async () => {
    await openDoc(["a", "b", "c", "d"]);

    await userEvent.clear(pageInput());
    await userEvent.type(pageInput(), "3{Enter}");
    expect(useViewerStore.getState().pageNumber).toBe(3);

    await userEvent.clear(pageInput());
    fireEvent.blur(pageInput());
    expect(pageInput().value).toBe("3");

    await userEvent.clear(pageInput());
    await userEvent.type(pageInput(), "99{Enter}");
    expect(useViewerStore.getState().pageNumber).toBe(4);
  });

  it("uses arrow keys for pages, but not while typing in a field", async () => {
    useViewerStore.getState().setSidebarTab("search");
    await openDoc(["one", "two", "three"]);

    await userEvent.keyboard("{ArrowRight}");
    expect(useViewerStore.getState().pageNumber).toBe(2);

    await userEvent.click(screen.getByLabelText("Search query"));
    await userEvent.keyboard("{ArrowRight}");
    expect(useViewerStore.getState().pageNumber).toBe(2);
  });

  it("searches and jumps to a result page", async () => {
    useViewerStore.getState().setSidebarTab("search");
    await openDoc(["alpha beta", "needle is here", "omega"]);

    await userEvent.type(screen.getByLabelText("Search query"), "needle{Enter}");

    await waitFor(() => expect(screen.getByText("Page 2")).toBeInTheDocument());
    expect(pageInput().value).toBe("2");
  });

  it("renders every page container in scroll mode", async () => {
    useViewerStore.getState().setViewMode("scroll");
    await openDoc(["one", "two", "three"]);
    expect(screen.getByLabelText("PDF page 2")).toBeInTheDocument();
    expect(screen.getByLabelText("PDF page 3")).toBeInTheDocument();
  });

  it("explains why a file couldn't be opened", async () => {
    loadPdfMock.mockRejectedValue(Object.assign(new Error("nope"), { name: "PasswordException" }));
    useViewerStore.getState().setSource({ kind: "url", url: "https://example.com/locked.pdf" });
    render(<ViewerShell />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/password-protected/);
  });

  it("refuses files that aren't PDFs", async () => {
    render(<ViewerShell />);
    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, new File(["hi"], "notes.txt", { type: "text/plain" }), { applyAccept: false });
    expect(await screen.findByRole("status")).toHaveTextContent("isn’t a PDF");
    expect(useViewerStore.getState().source.kind).toBe("none");
  });
});
