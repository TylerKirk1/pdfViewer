import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { App } from "../App";
import { useViewerStore } from "../state/store";

vi.mock("../ViewerShell", () => ({
  ViewerShell: () => <div data-testid="shell" />
}));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    useViewerStore.setState(useViewerStore.getInitialState(), true);
  });

  it("pins light/dark on <html> and clears it for system", () => {
    render(<App />);
    const root = document.documentElement;
    expect(root.hasAttribute("data-theme")).toBe(false);

    act(() => useViewerStore.getState().setTheme("dark"));
    expect(root.dataset.theme).toBe("dark");

    act(() => useViewerStore.getState().cycleTheme());
    expect(root.hasAttribute("data-theme")).toBe(false);

    act(() => useViewerStore.getState().cycleTheme());
    expect(root.dataset.theme).toBe("light");
  });
});
