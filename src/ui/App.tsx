import React, { useEffect } from "react";
import { ViewerShell } from "./ViewerShell";
import { useViewerStore } from "./state/store";
import { applyThemeToDocument } from "./theme/applyTheme";

export function App() {
  const theme = useViewerStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return <ViewerShell />;
}

