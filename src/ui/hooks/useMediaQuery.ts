import { useEffect, useState } from "react";

function matches(query: string) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

export function useMediaQuery(query: string) {
  const [isMatch, setIsMatch] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setIsMatch(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMatch;
}
