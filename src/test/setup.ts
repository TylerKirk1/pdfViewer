import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Node 25+ ships its own global `localStorage`, which shadows jsdom's and has no
// methods unless Node is started with --localstorage-file. Fall back to memory.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value))
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const existing = (globalThis as any).localStorage;
if (!existing || typeof existing.getItem !== "function" || typeof existing.removeItem !== "function") {
  Object.defineProperty(globalThis, "localStorage", { value: createMemoryStorage(), configurable: true, writable: true });
}

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
  ({ setTransform() {}, drawImage() {} } as any);

// jsdom doesn't implement scrolling APIs.
HTMLElement.prototype.scrollIntoView = () => {};
