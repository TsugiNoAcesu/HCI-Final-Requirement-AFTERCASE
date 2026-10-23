import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const width = 1440;
const height = 1000;
const palettes = {
  wireframe: { bg: "#f2f2f2", panel: "#ffffff", raised: "#e9e9e9", line: "#b8b8b8", ink: "#333333", muted: "#707070", accent: "#a0a0a0", soft: "#dedede", green: "#d5d5d5" },
  mockup: { bg: "#111412", panel: "#191e1b", raised: "#202622", line: "#354039", ink: "#e9e4d9", muted: "#a5ada4", accent: "#d9a96c", soft: "#392d20", green: "#203329" }
};

function esc(text) { return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function makeSvg(theme, title, body) {
  const p = palettes[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">AFTERCASE ${theme} screen, ${esc(title)}</desc><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="${p.panel}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity=".16"/></filter></defs><rect width="1440" height="1000" fill="url(#bg)"/>${body(p, theme)}</svg>`;
}
function rect(x, y, w, h, p, fill = "panel", radius = 10, stroke = "line", extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${p[fill] ?? fill}" stroke="${p[stroke] ?? stroke}" ${extra}/>`; }
function text(x, y, value, p, size = 16, color = "ink", weight = 400, family = "Inter, Arial, sans-serif", extra = "") { return `<text x="${x}" y="${y}" fill="${p[color] ?? color}" font-family="${family}" font-size="${size}" font-weight="${weight}" ${extra}>${esc(value)}</text>`; }
function lines(x, y, values, p, options = {}) { const gap = options.gap ?? 26; return values.map((v, i) => text(x, y + i * gap, v, p, options.size ?? 15, options.color ?? "muted", options.weight ?? 400, options.family ?? "Inter, Arial, sans-serif")).join(""); }
function button(x, y, w, label, p, primary = false, h = 46) { return rect(x, y, w, h, p, primary ? "accent" : "panel", 7, primary ? "accent" : "line") + text(x + w / 2, y + h / 2 + 5, label, p, 14, primary ? (p === palettes.mockup ? "#111412" : "ink") : "ink", 600, "Inter, Arial, sans-serif", 'text-anchor="middle"'); }
function tag(x, y, label, p, accent = false) { const w = Math.max(72, label.length * 8 + 28); return rect(x, y, w, 28, p, accent ? "soft" : "raised", 14, accent ? "accent" : "line") + `<circle cx="${x + 13}" cy="${y + 14}" r="3" fill="${accent ? p.accent : p.muted}"/>` + text(x + 22, y + 19, label.toUpperCase(), p, 10, accent ? "accent" : "muted", 600, "IBM Plex Mono, monospace", 'letter-spacing=".6"'); }
function input(x, y, w, label, value, p, h = 48) { return text(x, y, label, p, 13, "muted", 500) + rect(x, y + 12, w, h, p, "bg", 5, "line") + text(x + 14, y + 42, value, p, 14, value.startsWith("Enter") || value.startsWith("Choose") ? "muted" : "ink"); }
function topbar(p, active = "Home") {
  let out = rect(0, 0, 1440, 82, p, "bg", 0, "line");
  out += text(62, 50, "A.", p, 27, "accent", 600, "Georgia, serif");
  out += text(105, 43, "AFTERCASE", p, 15, "ink", 700, "IBM Plex Mono, monospace", 'letter-spacing="2"');
  out += text(105, 61, "PRIVATE CASE ARCHIVE", p, 9, "muted", 400, "IBM Plex Mono, monospace", 'letter-spacing="1"');
  const links = [["Home", 520], ["Explore Cases", 635], ["My Archive", 805]];
  for (const [label, x] of links) {
    if (active === label) out += rect(x - 14, 21, label.length * 9 + 28, 40, p, "panel", 6, "line");
    out += text(x, 47, label, p, 14, active === label ? "ink" : "muted", active === label ? 600 : 500);
  }
  out += button(971, 19, 122, "＋ Add Case", p, true, 44);
  out += `<circle cx="1280" cy="40" r="17" fill="${p.panel}" stroke="${p.line}"/>`;
  out += text(1280, 45, "G", p, 13, "accent", 600, "IBM Plex Mono, monospace", 'text-anchor="middle"');
  out += text(1310, 46, "Guest", p, 14, "muted", 500);
  return out;
}
function pageIntro(p, eyebrow, title, subtitle) { return text(90, 143, eyebrow.toUpperCase(), p, 11, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1.4"') + text(90, 193, title, p, 38, "ink", 500, "Playfair Display, Georgia, serif") + text(90, 226, subtitle, p, 16, "muted"); }
function footer(p) { return `<path d="M90 950H1350" stroke="${p.line}"/><text x="90" y="978" fill="${p.muted}" font-family="IBM Plex Mono,monospace" font-size="10" letter-spacing="1">AFTERCASE · A PERSONAL MYSTERY ARCHIVE</text>`; }

function login(p, theme) {
  let out = `<rect width="620" height="1000" fill="${p.panel}"/><path d="M620 0V1000" stroke="${p.line}"/>`;
  out += text(72, 77, "A.", p, 35, "accent", 600, "Georgia, serif") + text(126, 58, "AFTERCASE", p, 15, "ink", 700, "IBM Plex Mono, monospace", 'letter-spacing="2"') + text(126, 80, "PRIVATE ARCHIVE", p, 10, "muted", 400, "IBM Plex Mono, monospace", 'letter-spacing="1"');
  out += text(72, 390, "FIELD NOTES · OPEN FILES", p, 11, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1.5"') + text(72, 472, "Some stories", p, 48, "ink", 500, "Playfair Display, Georgia, serif") + text(72, 532, "stay open.", p, 48, "ink", 500, "Playfair Display, Georgia, serif");
  out += rect(72, 720, 156, 156, p, "bg", 0, "line") + text(150, 761, "CASE REGISTER", p, 9, "muted", 500, "IBM Plex Mono, monospace", 'text-anchor="middle" letter-spacing="1"') + text(150, 820, "001", p, 38, "accent", 500, "Georgia, serif", 'text-anchor="middle"') + text(150, 853, "EVIDENCE · RECORD · RETURN", p, 8, "muted", 500, "IBM Plex Mono, monospace", 'text-anchor="middle"');
  out += text(785, 294, "SIGN IN", p, 11, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1.4"') + text(785, 347, "Return to your archive.", p, 31, "ink", 500, "Playfair Display, Georgia, serif") + text(785, 382, "Keep the facts, sources, and questions together.", p, 14, "muted");
  out += input(785, 438, 445, "Username", "Enter your username", p, 50) + input(785, 527, 445, "Password", "Enter your password", p, 50);
  out += `<rect x="786" y="627" width="17" height="17" rx="3" fill="${p.bg}" stroke="${p.line}"/>` + text(815, 641, "Keep me signed in on this device", p, 13, "muted");
  out += button(785, 682, 445, "Sign in", p, true, 48) + button(785, 744, 445, "Continue as Guest", p, false, 48) + text(1007, 827, "Prototype sign-in · No password is stored", p, 11, "muted", 400, "Inter, Arial, sans-serif", 'text-anchor="middle"');
  return out;
}
function dashboard(p) {
  let out = topbar(p, "Home");
  out += rect(90, 112, 1260, 190, p, "panel", 10, "line", 'stroke-width="1.2"') + `<path d="M91 115H286" stroke="${p.accent}" stroke-width="4"/>`;
  out += text(126, 158, "PRIVATE ARCHIVE / DASHBOARD", p, 10, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1.2"') + text(126, 218, "Good day, Guest.", p, 36, "ink", 500, "Playfair Display, Georgia, serif") + text(126, 254, "Friday, October 16, 2026", p, 14, "muted");
  out += rect(1168, 153, 126, 105, p, "bg", 0, "line") + text(1231, 195, "AFTERCASE", p, 11, "accent", 600, "IBM Plex Mono, monospace", 'text-anchor="middle"') + text(1231, 231, "001", p, 28, "ink", 500, "Georgia, serif", 'text-anchor="middle"');
  const stats = [["TOTAL CASES", "04", "in your archive"], ["IN PROGRESS", "02", "being investigated"], ["COMPLETED", "01", "research finished"], ["WATCHLIST", "03", "saved to return to"]];
  stats.forEach((item, i) => { const x = 90 + i * 321; out += rect(x, 328, 300, 118, p, "panel", 9) + text(x + 22, 363, item[0], p, 10, "muted", 600, "IBM Plex Mono, monospace", 'letter-spacing="1"') + text(x + 22, 409, item[1], p, 31, "accent", 500, "Georgia, serif") + text(x + 81, 408, item[2], p, 12, "muted"); });
  out += text(90, 502, "Quick actions", p, 22, "ink", 500, "Playfair Display, Georgia, serif") + button(274, 470, 142, "＋ Add Case", p, true) + button(430, 470, 157, "Explore Cases", p) + button(601, 470, 177, "Open My Archive", p);
  out += text(90, 574, "Continue investigating", p, 23, "ink", 500, "Playfair Display, Georgia, serif") + text(1350, 574, "All cases →", p, 13, "accent", 600, "Inter, Arial, sans-serif", 'text-anchor="end"');
  const cards = [["CASE 001", "The Northbridge Clock", "A sequence of unexplained events around a stopped clock."], ["CASE 002", "The Harbor Letters", "Three letters, two witnesses, and a missing date."], ["CASE 003", "The Glasshouse File", "Research notes are ready for another pass."]];
  cards.forEach((item, i) => { const x = 90 + i * 426; out += rect(x, 600, 405, 150, p, "panel", 9) + text(x + 20, 629, item[0], p, 10, "accent", 500, "IBM Plex Mono, monospace", 'letter-spacing="1"') + text(x + 20, 663, item[1], p, 20, "ink", 500, "Playfair Display, Georgia, serif") + lines(x + 20, 691, [item[2]], p, { size: 12, gap: 19 }) + tag(x + 20, 713, "In Progress", p, true); });
  out += text(90, 806, "Recently added", p, 23, "ink", 500, "Playfair Display, Georgia, serif");
  ["The Northbridge Clock", "The Harbor Letters", "The Glasshouse File"].forEach((label, i) => { const y = 833 + i * 35; out += `<path d="M90 ${y + 15}H1350" stroke="${p.line}"/>` + text(108, y + 10, `00${i + 1}`, p, 10, "accent", 500, "IBM Plex Mono, monospace") + text(192, y + 10, label, p, 13, "ink", 500) + tag(1160, y - 6, i === 1 ? "Not Started" : "In Progress", p); });
  return out + footer(p);
}
function explore(p) {
  let out = topbar(p, "Explore Cases") + pageIntro(p, "Personal Mystery Archive", "Explore Cases", "A quiet place to collect the details, sources, and questions that matter.");
  out += text(90, 290, "Cases", p, 24, "ink", 500, "Playfair Display, Georgia, serif") + text(1325, 288, "4 cases", p, 13, "muted", 400, "Inter, Arial, sans-serif", 'text-anchor="end"') + button(1190, 252, 160, "＋ Add Case", p, true);
  out += rect(90, 312, 1260, 151, p, "panel", 9);
  out += text(114, 342, "Search saved cases", p, 12, "muted", 500) + rect(114, 353, 540, 48, p, "bg", 5, "line") + text(130, 382, "Title, case number, keyword, person, location…", p, 13, "muted");
  out += text(692, 342, "Real-world status", p, 12, "muted", 500) + rect(692, 353, 263, 48, p, "bg", 5, "line") + text(708, 382, "All statuses  ▾", p, 13, "ink");
  out += text(978, 342, "Sort by", p, 12, "muted", 500) + rect(978, 353, 250, 48, p, "bg", 5, "line") + text(994, 382, "Recently updated  ▾", p, 13, "ink");
  out += button(114, 413, 108, "Grid", p, true, 35) + button(230, 413, 108, "List", p, false, 35) + button(1000, 413, 148, "Import JSON", p, false, 35) + button(1160, 413, 166, "Export Backup", p, false, 35);
  const cases = [["001", "The Northbridge Clock", "A sequence of events connected to a stopped clock and a locked archive room.", "Unsolved", "In Progress", "Historical"], ["002", "The Harbor Letters", "Three anonymous letters surfaced across two years. The original envelope is missing.", "Ongoing", "Not Started", "Documents"], ["003", "The Glasshouse File", "A careful review of witness accounts, dates, and surviving newspaper reports.", "Unknown", "Completed", "Witnesses"]];
  cases.forEach((item, i) => { const x = 90 + i * 426; out += rect(x, 489, 405, 318, p, "panel", 9) + `<path d="M${x + 1} 500V795" stroke="${p.accent}" stroke-width="3"/>` + text(x + 24, 526, `CASE ${item[0]}`, p, 10, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1"') + text(x + 24, 568, item[1], p, 22, "ink", 500, "Playfair Display, Georgia, serif") + lines(x + 24, 605, item[2].match(/.{1,46}(?:\s|$)/g)?.map(s => s.trim()).slice(0, 3) ?? [item[2]], p, { size: 13, gap: 21 }) + tag(x + 24, 690, item[3], p) + tag(x + 24, 727, item[4], p, true) + tag(x + 24, 764, item[5], p); });
  return out + footer(p);
}
function caseFile(p) {
  let out = topbar(p, "Explore Cases") + text(90, 124, "← Explore Cases", p, 13, "muted", 500) + rect(90, 152, 1260, 225, p, "panel", 10, "line", 'stroke-width="1.2"') + `<path d="M91 155H280" stroke="${p.accent}" stroke-width="4"/>`;
  out += text(126, 195, "CASE 001", p, 10, "accent", 600, "IBM Plex Mono, monospace", 'letter-spacing="1.3"') + text(126, 241, "The Northbridge Clock", p, 36, "ink", 500, "Playfair Display, Georgia, serif") + tag(126, 263, "Unsolved", p) + tag(216, 263, "In Progress", p, true) + button(126, 310, 125, "Edit Case", p, true) + button(265, 310, 237, "Add to My Archive watchlist", p) + button(1248, 310, 82, "Delete", p, false);
  out += rect(90, 404, 1260, 216, p, "panel", 9) + `<path d="M111 405H231" stroke="${p.accent}" stroke-width="4"/>` + text(120, 448, "Overview", p, 23, "ink", 500, "Playfair Display, Georgia, serif") + lines(120, 486, ["A concise case summary appears here, with key context and a note about what still needs", "to be verified. Sources and accounts are kept distinct so the record remains easy to", "review and continue researching."], p, { size: 15, gap: 26, color: "ink" });
  out += rect(90, 645, 1260, 244, p, "panel", 9) + `<path d="M111 646H231" stroke="${p.accent}" stroke-width="4"/>` + text(120, 690, "Timeline", p, 23, "ink", 500, "Playfair Display, Georgia, serif");
  out += `<path d="M137 717V852" stroke="${p.line}" stroke-width="2"/>`;
  [["14 MAY 1998", "A record is added to the archive."], ["02 JUN 1998", "A new witness statement is documented."], ["18 SEP 1998", "The case status is reviewed."]].forEach((e, i) => { const y = 727 + i * 51; out += `<circle cx="137" cy="${y}" r="5" fill="${p.accent}"/>` + text(160, y + 4, e[0], p, 10, "accent", 500, "IBM Plex Mono, monospace") + text(290, y + 4, e[1], p, 14, "ink"); });
  return out + footer(p);
}
function addCase(p) {
  let out = topbar(p, "Add Case") + text(90, 124, "← Explore Cases", p, 13, "muted", 500) + pageIntro(p, "Your Archive", "Add Case", "Record a real-world case. Leave optional details blank until verified.");
  out += rect(90, 268, 1260, 190, p, "panel", 9, "line", 'stroke-width="1.2"') + `<path d="M111 269H253" stroke="${p.accent}" stroke-width="4"/>` + text(120, 307, "Prepare from a file or transcript", p, 21, "ink", 500, "Playfair Display, Georgia, serif") + text(120, 333, "TXT, Markdown, VTT, or SRT. Files are read in this browser; suggestions come from labeled fields.", p, 12, "muted");
  out += text(120, 366, "Source file", p, 12, "muted", 500) + rect(120, 378, 430, 52, p, "bg", 5, "line") + text(138, 410, "Choose a file…", p, 13, "ink") + button(565, 378, 176, "Find labeled fields", p, false, 52) + button(754, 378, 144, "Clear source text", p, false, 52);
  out += rect(90, 480, 1260, 364, p, "panel", 9) + `<path d="M111 481H253" stroke="${p.accent}" stroke-width="4"/>` + text(120, 520, "Case details", p, 21, "ink", 500, "Playfair Display, Georgia, serif");
  const fieldData = [["Case title", "Enter case title"], ["Case number", "e.g. CASE-004"], ["My progress", "Not Started  ▾"], ["Real-world status", "Choose a status  ▾"], ["Location", "City, region"], ["Categories", "Separate with commas"], ["Keywords", "Separate with commas"]];
  fieldData.forEach((item, i) => { const col = i % 2; const row = Math.floor(i / 2); const x = 120 + col * 590; const y = 552 + row * 79; out += input(x, y, 550, item[0], item[1], p, 43); });
  out += text(120, 808, "Overview", p, 12, "muted", 500) + rect(120, 820, 1140, 58, p, "bg", 5, "line") + text(138, 851, "Add a concise overview…", p, 13, "muted");
  out += button(1110, 897, 110, "Cancel", p) + button(1232, 897, 118, "Save Case", p, true);
  return out + footer(p);
}
function archive(p) {
  let out = topbar(p, "My Archive") + pageIntro(p, "Your Private Collection", "My Archive", "Return to cases you are watching, researching, or have completed.");
  const sections = [["Watchlist", "Cases you have marked to return to.", [["001", "The Northbridge Clock", "Unsolved"], ["002", "The Harbor Letters", "Ongoing"]]], ["In Progress", "Cases you are currently researching.", [["001", "The Northbridge Clock", "In Progress"]]], ["Completed", "Research you have finished.", [["003", "The Glasshouse File", "Completed"]]]];
  sections.forEach((section, idx) => {
    const y = 273 + idx * 188;
    out += rect(90, y, 1260, 166, p, "panel", 9) + `<path d="M111 ${y + 1}H231" stroke="${p.accent}" stroke-width="4"/>` + text(120, y + 41, section[0], p, 22, "ink", 500, "Playfair Display, Georgia, serif") + text(120, y + 65, section[1], p, 12, "muted");
    section[2].forEach((row, i) => { const yy = y + 99 + i * 29; out += text(124, yy, `CASE ${row[0]}`, p, 10, "accent", 500, "IBM Plex Mono, monospace") + text(230, yy, row[1], p, 13, "ink", 500) + tag(1130, yy - 18, row[2], p, idx === 1); });
  });
  out += text(90, 856, "Personal Notes", p, 22, "ink", 500, "Playfair Display, Georgia, serif") + rect(90, 874, 1260, 55, p, "panel", 8) + text(115, 908, "Notes are grouped by case and remain in this browser.", p, 13, "muted");
  return out + footer(p);
}

// A traditional low-fidelity wireframe: content is represented by neutral lines and blocks,
// while only navigation, controls, and section labels retain readable text.
const wf = { bg: "#f7f7f7", panel: "#ffffff", raised: "#eeeeee", line: "#777777", ink: "#333333", muted: "#777777", accent: "#555555", soft: "#e0e0e0", green: "#e0e0e0" };
function wfBox(x, y, w, h, radius = 2, fill = "#ffffff") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="#777777" stroke-width="1.5"/>`; }
function wfLine(x, y, w, h = 8) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#d5d5d5"/>`; }
function wfLabel(x, y, label, size = 14, weight = 500) { return `<text x="${x}" y="${y}" fill="#333333" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}">${esc(label)}</text>`; }
function wfButton(x, y, w, label) { return wfBox(x, y, w, 44, 3, "#eeeeee") + `<text x="${x + w / 2}" y="${y + 27}" fill="#333333" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="600">${esc(label)}</text>`; }
function wfField(x, y, w, label, h = 44) { return wfLabel(x, y, label, 12, 600) + wfBox(x, y + 10, w, h, 2, "#ffffff"); }
function wfNav(active = "Home") {
  let out = wfBox(0, 0, width, 82, 0, "#ffffff") + `<path d="M0 82H1440" stroke="#777777" stroke-width="1.5"/>`;
  out += wfBox(50, 20, 40, 40, 2, "#eeeeee") + wfLabel(62, 47, "A", 22, 700) + wfLabel(105, 36, "AFTERCASE", 13, 700);
  [["Home", 515], ["Explore Cases", 625], ["My Archive", 795]].forEach(([label, x]) => { if (label === active) out += wfBox(x - 14, 20, label.length * 9 + 28, 42, 2, "#eeeeee"); out += wfLabel(x, 46, label, 13, label === active ? 700 : 400); });
  out += wfButton(971, 19, 122, "＋ Add Case") + wfBox(1262, 23, 34, 34, 17, "#eeeeee") + wfLabel(1310, 46, "Account ▾", 13);
  return out;
}
function wireframePage(key) {
  let out = "";
  if (key === "01-login") {
    out += wfBox(0, 0, 620, 1000, 0, "#eeeeee") + `<path d="M620 0V1000" stroke="#777777" stroke-width="1.5"/>`;
    out += wfBox(72, 45, 48, 48, 2, "#ffffff") + wfLabel(86, 76, "A", 26, 700) + wfLabel(135, 62, "AFTERCASE", 15, 700) + wfLabel(135, 82, "PRIVATE ARCHIVE", 10);
    out += wfLabel(72, 398, "Brand statement", 12, 600) + wfLine(72, 425, 410, 28) + wfLine(72, 466, 330, 28) + wfBox(72, 720, 150, 150, 0, "#ffffff") + wfLabel(104, 803, "Logo / stamp", 12);
    out += wfLabel(785, 294, "SIGN IN", 11, 700) + wfLine(785, 315, 360, 25) + wfLine(785, 354, 425, 8);
    out += wfField(785, 430, 445, "Username", 48) + wfField(785, 523, 445, "Password", 48) + wfBox(786, 623, 17, 17, 2) + wfLine(814, 627, 245, 9) + wfButton(785, 680, 445, "Sign in") + wfButton(785, 742, 445, "Continue as Guest") + wfLine(895, 822, 220, 7);
    return out;
  }
  out += wfNav(key === "02-dashboard" ? "Home" : key === "06-my-archive" ? "My Archive" : key === "05-add-case" ? "" : "Explore Cases");
  if (key === "02-dashboard") {
    out += wfBox(90, 112, 1260, 190, 3, "#eeeeee") + wfLabel(126, 157, "DASHBOARD", 11, 700) + wfLine(126, 176, 390, 24) + wfLine(126, 215, 235, 9) + wfBox(1168, 153, 126, 105, 2, "#ffffff") + wfLabel(1204, 211, "Brand mark", 12);
    for (let i = 0; i < 4; i++) { const x = 90 + i * 321; out += wfBox(x, 328, 300, 118, 3) + wfLine(x + 20, 350, 115, 8) + wfLine(x + 20, 376, 53, 26) + wfLine(x + 20, 414, 160, 7); }
    out += wfLabel(90, 502, "Quick actions", 19, 700) + wfButton(274, 470, 142, "Add Case") + wfButton(430, 470, 157, "Explore Cases") + wfButton(601, 470, 177, "My Archive");
    out += wfLabel(90, 574, "Continue investigating", 19, 700);
    for (let i = 0; i < 3; i++) { const x = 90 + i * 426; out += wfBox(x, 600, 405, 150, 3) + wfLine(x + 20, 620, 90, 8) + wfLine(x + 20, 646, 230, 15) + wfLine(x + 20, 678, 300, 8) + wfBox(x + 20, 710, 100, 24, 12, "#eeeeee"); }
    out += wfLabel(90, 806, "Recently added", 19, 700);
    for (let i = 0; i < 3; i++) { const y = 833 + i * 35; out += `<path d="M90 ${y + 15}H1350" stroke="#b0b0b0"/>` + wfLine(108, y, 35, 8) + wfLine(192, y, 300, 8) + wfBox(1160, y - 8, 100, 22, 11, "#eeeeee"); }
    return out;
  }
  if (key === "03-explore-cases") {
    out += wfLabel(90, 143, "YOUR ARCHIVE", 11, 700) + wfLine(90, 161, 330, 28) + wfLine(90, 203, 460, 8) + wfLabel(90, 290, "Cases", 20, 700) + wfButton(1190, 252, 160, "Add Case");
    out += wfBox(90, 312, 1260, 151, 3, "#eeeeee") + wfField(114, 333, 520, "Search cases", 38) + wfField(692, 333, 245, "Status filter", 38) + wfField(978, 333, 250, "Sort", 38) + wfButton(114, 413, 98, "Grid") + wfButton(220, 413, 98, "List") + wfButton(1000, 413, 148, "Import") + wfButton(1160, 413, 166, "Export");
    for (let i = 0; i < 3; i++) { const x = 90 + i * 426; out += wfBox(x, 489, 405, 318, 3) + wfLine(x + 24, 516, 76, 8) + wfLine(x + 24, 548, 260, 16) + wfLine(x + 24, 582, 325, 8) + wfLine(x + 24, 600, 285, 8) + wfLine(x + 24, 618, 215, 8) + wfBox(x + 24, 670, 95, 25, 12, "#eeeeee") + wfBox(x + 24, 705, 120, 25, 12, "#eeeeee") + wfBox(x + 24, 740, 100, 25, 12, "#eeeeee"); }
    return out;
  }
  if (key === "04-case-file") {
    out += wfLabel(90, 124, "← Explore Cases", 13) + wfBox(90, 152, 1260, 225, 3, "#eeeeee") + wfLine(126, 176, 80, 8) + wfLine(126, 203, 420, 23) + wfBox(126, 263, 78, 24, 12, "#ffffff") + wfBox(216, 263, 102, 24, 12, "#ffffff") + wfButton(126, 310, 125, "Edit Case") + wfButton(265, 310, 237, "Watchlist") + wfButton(1248, 310, 82, "Delete");
    out += wfBox(90, 404, 1260, 216, 3) + wfLabel(120, 448, "Overview", 19, 700) + wfLine(120, 468, 870, 10) + wfLine(120, 491, 1010, 10) + wfLine(120, 514, 940, 10) + wfLine(120, 537, 680, 10);
    out += wfBox(90, 645, 1260, 244, 3) + wfLabel(120, 690, "Timeline", 19, 700) + `<path d="M137 717V852" stroke="#999999" stroke-width="2"/>`;
    for (let i = 0; i < 3; i++) { const y = 727 + i * 51; out += `<circle cx="137" cy="${y}" r="5" fill="#777777"/>` + wfLine(160, y - 5, 110, 8) + wfLine(290, y - 5, 480, 8); }
    return out;
  }
  if (key === "05-add-case") {
    out += wfLabel(90, 124, "← Explore Cases", 13) + wfLabel(90, 157, "YOUR ARCHIVE", 11, 700) + wfLine(90, 174, 280, 23) + wfLine(90, 211, 460, 8);
    out += wfBox(90, 268, 1260, 190, 3, "#eeeeee") + wfLabel(120, 307, "Prepare from file or transcript", 18, 700) + wfLine(120, 321, 760, 8) + wfField(120, 350, 430, "Source file", 42) + wfButton(565, 378, 176, "Find fields") + wfButton(754, 378, 144, "Clear");
    out += wfBox(90, 480, 1260, 364, 3) + wfLabel(120, 520, "Case details", 18, 700);
    out += [["Case title", "Case number"], ["My progress", "Real-world status"], ["Location", "Categories"], ["Keywords", "Image URL"]].map((row, i) => { const y = 545 + i * 70; return wfField(120, y, 550, row[0], 38) + wfField(710, y, 550, row[1], 38); }).join("");
    out += wfField(120, 830, 1140, "Overview", 42) + wfButton(1110, 897, 110, "Cancel") + wfButton(1232, 897, 118, "Save Case");
    return out;
  }
  out += wfLabel(90, 143, "YOUR ARCHIVE", 11, 700) + wfLine(90, 161, 330, 28) + wfLine(90, 203, 520, 8);
  ["Watchlist", "In Progress", "Completed"].forEach((label, i) => { const y = 273 + i * 188; out += wfBox(90, y, 1260, 166, 3) + wfLabel(120, y + 41, label, 19, 700) + wfLine(120, y + 50, 440, 8); for (let j = 0; j < (i === 0 ? 2 : 1); j++) { const yy = y + 98 + j * 29; out += wfLine(124, yy, 55, 8) + wfLine(230, yy, 265, 8) + wfBox(1130, yy - 16, 100, 23, 11, "#eeeeee"); } });
  out += wfLabel(90, 856, "Personal Notes", 19, 700) + wfBox(90, 874, 1260, 55, 3) + wfLine(115, 897, 420, 8);
  return out;
}

const screens = { "01-login": ["Login", login], "02-dashboard": ["Dashboard", dashboard], "03-explore-cases": ["Explore Cases", explore], "04-case-file": ["Case File", caseFile], "05-add-case": ["Add Case", addCase], "06-my-archive": ["My Archive", archive] };
for (const theme of Object.keys(palettes)) {
  const dir = path.join(root, theme);
  await mkdir(dir, { recursive: true });
  for (const [filename, [title, render]] of Object.entries(screens)) {
    const content = makeSvg(theme, title, theme === "wireframe" ? () => wireframePage(filename) : (p, name) => render(p, name));
    await writeFile(path.join(dir, `${filename}.svg`), content, "utf8");
  }
}
