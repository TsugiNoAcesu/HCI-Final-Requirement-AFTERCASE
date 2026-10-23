import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));

for (const page of pages) {
  const source = await readFile(path.join(root, page), "utf8");
  check(/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(source), `${page}: missing html lang`);
  check(/<title>\s*[^<]+\s*<\/title>/i.test(source), `${page}: missing title`);
  check(/<link\b[^>]*href=["']style\.css["']/i.test(source), `${page}: missing style.css`);
  check((source.match(/<h1\b/gi) ?? []).length === 1, `${page}: expected exactly one h1`);
  check(/<main\b/i.test(source), `${page}: missing main landmark`);
  check(/class=["'][^"']*skip-link/.test(source), `${page}: missing skip link`);
  check(!/\sstyle\s*=/i.test(source), `${page}: inline style attribute found`);
  check(!/\bhref\s*=\s*["']\s*#["']/i.test(source), `${page}: placeholder href="#" found`);
  check(!/\baria-disabled\s*=/i.test(source), `${page}: aria-disabled found`);
  if (page !== "login.html") check(/scripts\/layout\.js/.test(source), `${page}: missing shared layout module`);

  for (const [, rawPath] of source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    if (!rawPath || /^(?:[a-z]+:|\/\/|data:|javascript:)/i.test(rawPath)) continue;
    const filePart = rawPath.split(/[?#]/, 1)[0];
    if (!filePart) continue;
    const target = path.resolve(root, decodeURIComponent(filePart));
    check(target.startsWith(`${root}${path.sep}`) || target === root, `${page}: internal path escapes project: ${rawPath}`);
    try { await stat(target); }
    catch { failures.push(`${page}: missing internal target ${rawPath}`); }
  }
}

const css = await readFile(path.join(root, "style.css"), "utf8");
check(css.startsWith("@import url(\"https://fonts.googleapis.com/"), "style.css: Google Fonts import must be first");
check((css.match(/@import\b/g) ?? []).length === 1, "style.css: expected exactly one import");
const rootBlock = css.match(/:root\s*\{[\s\S]*?\}/)?.[0] ?? "";
check(Boolean(rootBlock), "style.css: missing :root design token block");
const outsideTokens = css.replace(rootBlock, "");
check(!/(?:#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\()/i.test(outsideTokens), "style.css: color literal outside :root");

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`prototype audit passed (${pages.length} HTML pages)`);
}
