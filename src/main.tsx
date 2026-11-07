import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
// pdf.js's own layer styles (text selection, links, form fields); ours come after.
import "pdfjs-dist/web/pdf_viewer.css";
import "./ui/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
