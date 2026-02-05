import { useEffect, useState } from "react";

export function useOnScreen<T extends Element>(ref: React.RefObject<T>, root: Element | null) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setIsVisible(entry.isIntersecting);
      },
      { root, rootMargin: "400px 0px 400px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root]);

  return isVisible;
}

