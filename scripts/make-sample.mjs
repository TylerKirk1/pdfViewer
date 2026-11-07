// Generates public/sample.pdf: a small document that exercises the viewer
// (outline, internal + external links, searchable text, a landscape page).
// No dependencies; writes raw PDF objects. Run with: npm run sample
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sample.pdf");
const REPO_URL = "https://github.com/TylerKirk1/pdfViewer";

const LETTER = [612, 792];
const LANDSCAPE = [792, 612];
const INK = "0.11 0.11 0.12";
const MUTED = "0.42 0.42 0.45";
const LINK = "0.17 0.39 0.85";

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** Builds a page's content stream plus the link annotations on it. */
function page(size, draw) {
  const ops = [];
  const links = [];
  const ctx = {
    text(x, y, str, { font = "F1", size = 11, color = INK } = {}) {
      ops.push(`BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${esc(str)}) Tj ET`);
    },
    para(x, y, lines, opts = {}) {
      const lead = opts.leading ?? 16;
      lines.forEach((l, i) => ctx.text(x, y - i * lead, l, opts));
      return y - lines.length * lead;
    },
    rect(x, y, w, h, color) {
      ops.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
    },
    // Approximate Helvetica width (0.5em avg) is fine for link hit boxes.
    link(x, y, str, size, target) {
      ctx.text(x, y, str, { size, color: LINK });
      const w = str.length * size * 0.5;
      ctx.rect(x, y - 2, w, 0.75, LINK);
      links.push({ rect: [x - 2, y - 4, x + w + 2, y + size], target });
    }
  };
  draw(ctx);
  return { size, content: ops.join("\n"), links };
}

const TOTAL = 5;
function footer(c, n, [w]) {
  c.rect(72, 60, w - 144, 0.5, "0.85 0.85 0.85");
  c.text(72, 44, "pdfViewer sample", { size: 9, color: MUTED });
  c.text(w - 72 - 48, 44, `page ${n} of ${TOTAL}`, { size: 9, color: MUTED });
}

function heading(c, n, title, [, h]) {
  c.text(72, h - 96, `${n}`, { font: "F2", size: 11, color: MUTED });
  c.text(72, h - 124, title, { font: "F2", size: 26 });
  c.rect(72, h - 144, 40, 2, INK);
}

const sections = ["Cover", "Getting around", "Searching", "Links", "A landscape page"];

const pages = [
  page(LETTER, (c) => {
    c.text(72, 700, "SAMPLE DOCUMENT", { size: 9, color: MUTED });
    c.text(72, 640, "pdfViewer", { font: "F2", size: 44 });
    c.text(72, 610, "A small, fast PDF viewer that runs entirely in your browser.", { size: 14, color: MUTED });
    c.rect(72, 580, 468, 0.75, "0.8 0.8 0.8");
    let y = c.para(72, 548, [
      "This file ships with the app so there is always something to try. Everything",
      "here is real PDF content: text you can select and search, an outline in the",
      "sidebar, links that jump around the document, and a landscape page at the end.",
      "",
      "Use the arrow keys or the toolbar to move between pages. Open the sidebar for",
      "page thumbnails, the outline, and search."
    ]);
    c.text(72, y - 24, "Contents", { font: "F2", size: 13 });
    sections.forEach((s, i) => {
      const yy = y - 52 - i * 22;
      c.text(72, yy, String(i + 1), { size: 11, color: MUTED });
      c.link(92, yy, s, 11, { page: i });
    });
    footer(c, 1, LETTER);
  }),
  page(LETTER, (c) => {
    heading(c, 2, "Getting around", LETTER);
    const keys = [
      ["Left / Right arrow", "Previous / next page"],
      ["Home / End", "First / last page"],
      ["Ctrl + / Ctrl -", "Zoom in / out"],
      ["Ctrl 0", "Reset zoom"],
      ["Ctrl + mouse wheel", "Zoom with a mouse or trackpad"],
      ["Ctrl F", "Search the document"],
      ["Ctrl O", "Open another file"]
    ];
    keys.forEach(([k, v], i) => {
      const y = 600 - i * 26;
      c.rect(72, y - 9, 468, 0.5, "0.9 0.9 0.9");
      c.text(72, y, k, { font: "F2", size: 11 });
      c.text(250, y, v, { size: 11, color: MUTED });
    });
    c.para(72, 380, [
      "On a Mac, use Cmd instead of Ctrl.",
      "",
      "The zoom menu has three automatic modes. Auto picks a comfortable size, Fit",
      "width fills the window from side to side, and Fit page shows a whole page at",
      "once. The button with two stacked pages switches between continuous scrolling",
      "and one page at a time."
    ]);
    footer(c, 2, LETTER);
  }),
  page(LETTER, (c) => {
    heading(c, 3, "Searching", LETTER);
    let y = c.para(72, 600, [
      "Press Ctrl F, type a word, and press Enter. Every match is highlighted, the",
      "sidebar lists the pages they are on, and Enter keeps jumping to the next one.",
      "Try it with the word lighthouse, which appears several times below."
    ]);
    c.rect(72, y - 20, 3, -150, "0.85 0.85 0.85");
    c.para(88, y - 34, [
      "The lighthouse stood at the end of a long stone pier. Every evening the keeper",
      "climbed the stairs, wound the clockwork, and lit the lamp. Ships far out at sea",
      "watched for the lighthouse long before they could see the coast, and counted",
      "its flashes to know which harbour they had found. When the new electric",
      "lighthouse was built further along the shore, the old one was left standing,",
      "and on clear nights people still walk out along the pier to look at it."
    ], { color: MUTED });
    footer(c, 3, LETTER);
  }),
  page(LETTER, (c) => {
    heading(c, 4, "Links", LETTER);
    c.text(72, 600, "Links inside a document jump to another page:", { size: 11 });
    c.link(72, 576, "Back to the cover", 12, { page: 0 });
    c.text(72, 530, "Links to the web open in a new tab:", { size: 11 });
    c.link(72, 506, REPO_URL.replace("https://", ""), 12, { uri: REPO_URL });
    c.para(72, 450, [
      "Both kinds are drawn by pdf.js's annotation layer on top of the page, so they",
      "stay clickable at any zoom level and survive rotation."
    ], { color: MUTED });
    footer(c, 4, LETTER);
  }),
  page(LANDSCAPE, (c) => {
    heading(c, 5, "A landscape page", LANDSCAPE);
    c.para(72, 420, [
      "Pages in one document can have different sizes and orientations. Choose Fit",
      "page in the zoom menu to see all of this one, or rotate everything with the",
      "rotate button in the toolbar."
    ], { color: MUTED });
    const bars = [62, 88, 54, 120, 96, 140, 110];
    bars.forEach((h, i) => {
      const x = 470 + i * 34;
      c.rect(x, 300, 22, h, i === 5 ? LINK : "0.78 0.78 0.8");
      c.text(x + 6, 284, "MTWTFSS"[i], { size: 9, color: MUTED });
    });
    c.rect(462, 300, 250, 0.75, "0.6 0.6 0.6");
    footer(c, 5, LANDSCAPE);
  })
];

// ── Assemble objects ──────────────────────────────────────────────────────
const objects = [];
const add = (body) => (objects.push(body), objects.length);

const catalogId = add(null);
const pagesId = add(null);
const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
const pageIds = pages.map(() => add(null));

pages.forEach((p, i) => {
  const contentId = add(`<< /Length ${Buffer.byteLength(p.content, "latin1")} >>\nstream\n${p.content}\nendstream`);
  const annotIds = p.links.map((l) => {
    const action = l.uri
      ? `/A << /S /URI /URI (${esc(l.uri)}) >>`
      : `/Dest [${pageIds[l.target.page]} 0 R /Fit]`;
    return add(`<< /Type /Annot /Subtype /Link /Rect [${l.rect.join(" ")}] /Border [0 0 0] ${action} >>`);
  });
  objects[pageIds[i] - 1] =
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${p.size.join(" ")}] ` +
    `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R` +
    (annotIds.length ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]` : "") +
    " >>";
});

const outlineId = add(null);
const itemIds = sections.map(() => add(null));
sections.forEach((title, i) => {
  objects[itemIds[i] - 1] =
    `<< /Title (${esc(title)}) /Parent ${outlineId} 0 R /Dest [${pageIds[i]} 0 R /Fit]` +
    (i > 0 ? ` /Prev ${itemIds[i - 1]} 0 R` : "") +
    (i < sections.length - 1 ? ` /Next ${itemIds[i + 1]} 0 R` : "") +
    " >>";
});
objects[outlineId - 1] = `<< /Type /Outlines /First ${itemIds[0]} 0 R /Last ${itemIds.at(-1)} 0 R /Count ${sections.length} >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R /Outlines ${outlineId} 0 R >>`;

let pdf = "%PDF-1.7\n%\xE2\xE3\xCF\xD3\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info << /Title (pdfViewer sample) >> >>\nstartxref\n${xref}\n%%EOF\n`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(pdf, "latin1"));
console.log(`Wrote ${out} (${pages.length} pages)`);
