# Tasks

This file is the running backlog for the pdfViewer project.

## In Progress
- Polish: search UX (highlighting) + better outline interactions

## Backlog
- Text layer + search highlights (real highlight, not just result list)
- Continuous scroll mode (single page vs scroll)
- “Fit to width” and “fit to page” modes: better heuristics + dedicated UI state
- Recent files list (local only) with quick reopen
- Basic annotations: highlight/underline/notes (stored locally first)
- Export: print, download, and “extract selected pages”
- Performance: render queue, cancellation, and thumbnail caching
- Accessibility pass (keyboard focus, ARIA, reduced motion)
- E2E tests with Playwright using a fixture PDF

## Done
- Git repo + GitHub remote over SSH
- Vite + React + PDF.js scaffold
- Theme presets + accent customization
- Sidebar with tabs (Pages/Outline/Search)
- Thumbnails panel (lazy render)
- Outline panel (basic destination resolution)
- Search panel (text search + result jump)
- Fit-to-width and fit-to-page view modes
- Removed background gradients for a cleaner modern look
- Vitest + Testing Library tests
