import React, { useEffect } from "react";
import { ViewerShell } from "./ViewerShell";
import { useViewerStore } from "./state/store";
import { applyTheme } from "./theme/theme";

export function App() {
  const theme = useViewerStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <ViewerShell />;
}
