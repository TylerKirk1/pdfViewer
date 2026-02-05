import { useEffect, useState } from "react";

export function useResizeObserver<T extends Element>(ref: React.RefObject<T>) {
  const [rect, setRect] = useState<DOMRectReadOnly | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setRect(entry.contentRect);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return rect;
}

