function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function applyTextHighlights(textDivs: HTMLElement[], textContentItemsStr: string[], queryRaw: string) {
  const query = queryRaw.trim();
  if (!query) {
    // Restore plain text.
    for (let i = 0; i < textDivs.length; i++) {
      const div = textDivs[i];
      const t = textContentItemsStr[i] ?? div.textContent ?? "";
      div.textContent = t;
    }
    return;
  }

  const q = query.toLowerCase();
  for (let i = 0; i < textDivs.length; i++) {
    const div = textDivs[i];
    const t = textContentItemsStr[i] ?? "";
    const lower = t.toLowerCase();
    let from = 0;
    let out = "";
    while (true) {
      const idx = lower.indexOf(q, from);
      if (idx < 0) break;
      out += escapeHtml(t.slice(from, idx));
      out += `<mark class="hl">${escapeHtml(t.slice(idx, idx + query.length))}</mark>`;
      from = idx + query.length;
    }
    out += escapeHtml(t.slice(from));
    // eslint-disable-next-line no-param-reassign
    div.innerHTML = out || escapeHtml(t);
  }
}

