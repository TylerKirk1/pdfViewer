import { describe, it, expect } from "vitest";
import { applyTextHighlights } from "../highlight";

function div() {
  const d = document.createElement("div");
  return d;
}

describe("applyTextHighlights", () => {
  it("wraps matches in a mark.hl", () => {
    const d1 = div();
    const d2 = div();
    applyTextHighlights([d1, d2], ["Hello world", "needle in haystack"], "needle");
    expect(d1.innerHTML).toContain("Hello world");
    expect(d2.innerHTML).toContain('class="hl"');
  });

  it("restores plain text when query is empty", () => {
    const d1 = div();
    d1.innerHTML = 'x<mark class="hl">y</mark>z';
    applyTextHighlights([d1], ["xyz"], "");
    expect(d1.textContent).toBe("xyz");
  });
});

