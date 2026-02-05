import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { App } from "../App";
import { useViewerStore } from "../state/store";

vi.mock("../ViewerShell", () => ({
  ViewerShell: () => <div data-testid="shell" />
}));

function resetStore() {
  localStorage.removeItem("pdfviewer:state:v1");
  useViewerStore.setState({
    source: { kind: "none" },
    pageNumber: 1,
    numPages: 0,
    scale: 1.1,
    rotation: 0,
    fitMode: "free",
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

describe("App", () => {
  beforeEach(() => resetStore());

  it("applies CSS variables for theme", () => {
    render(<App />);
    useViewerStore.getState().setTheme({
      accent: "#FF0000",
      surface: "#111111",
      background: "#222222",
      text: "#EEEEEE",
      mutedText: "#BBBBBB",
      panel: "#333333",
      border: "rgba(0,0,0,0.2)"
    });
    return waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF0000");
      expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#222222");
    });
  });
});
