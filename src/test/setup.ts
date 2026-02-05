import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Minimal polyfills for components that depend on browser observers.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverStub;

class IntersectionObserverStub {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly cb: any) {
    // Immediately report "not intersecting" for determinism in tests.
    this.cb([{ isIntersecting: false }]);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver = IntersectionObserverStub;

// Canvas in jsdom doesn't implement 2D contexts. Mock enough to avoid crashes.
HTMLCanvasElement.prototype.getContext = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ setTransform() {} } as any);
