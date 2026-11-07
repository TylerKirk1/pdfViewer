# Tasks

This file is the running backlog for the pdfViewer project.

## Backlog
- Recent files list (local only) with quick reopen
- Basic annotations: highlight/underline/notes (stored locally first)
- Export: print, download, and “extract selected pages”
- Password-protected PDFs (prompt for the password)
- Thumbnail cache across tab switches; lazy-load margin for thumbnails inside the sidebar
- E2E tests with Playwright using `public/sample.pdf` as the fixture

## Done
- Git repo + GitHub remote
- Vite + React + PDF.js scaffold
- Sidebar with tabs (Pages/Outline/Search)
- Thumbnails panel (lazy render, follows the current page)
- Outline panel (nested, with page numbers)
- Search: highlighted matches, results list, Enter / Shift+Enter across pages, Ctrl+F
- Text layer for selection + annotation layer for links/forms (aligned via `--scale-factor`)
- Lazy-loaded PDF.js to reduce initial bundle size
- Continuous scroll: lazy rendering, bitmaps released off-screen, reliable current-page tracking,
  reading position kept across zoom/rotation
- Render cancellation; off-screen rendering so zoom never flashes blank
- Zoom: Auto / Fit page / Fit width / presets, stepped Ctrl +/-, Ctrl+wheel and pinch
- Respect each page's own rotation; user rotation on top
- Start screen with bundled sample, drag-and-drop anywhere, clear error states
- Redesign: system light/dark theme, SVG icons, mobile drawer layout
- Vitest + Testing Library tests
- GitHub Pages deploy (`npm run deploy`)
