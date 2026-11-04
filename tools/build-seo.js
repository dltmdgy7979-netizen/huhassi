/* 후하씨 — 검색·공유용 메타 정리 + sitemap.xml + robots.txt 만들기
   쓰는 법:  node tools/build-seo.js
   도메인을 바꾸면 아래 BASE 한 줄만 고치고 다시 실행하면 됩니다.
   SPDX-License-Identifier: MIT */
const fs = require("fs");
const path = require("path");

const BASE = process.env.SITE_BASE || "https://huhassi-web-production.up.railway.app";
const ROOT = path.join(__dirname, "..", "public");
const OG_IMAGE = BASE + "/og.png";

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith(".html")) out.push(full);
  }
  return out;
};

const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const pick = (html, re) => { const m = html.match(re); return m ? m[1].trim() : ""; };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 템플릿(샘플 페이지)과 404 는 검색에 올리지 않는다
const noindex = (r) => /(^|\/)template\.html$/.test(r) || r === "404.html" || r === "request.html";

let changed = 0;
const pages = [];

for (const file of walk(ROOT)) {
  const r = rel(file);
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  const title = pick(html, /<title>([\s\S]*?)<\/title>/i);
  const desc = pick(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const url = BASE + "/" + r;

  // 이미 있는 것은 지우고 한 번에 다시 넣는다 (중복 방지)
  // 아이콘 줄에는 data: URI 안에 '>' 가 들어 있을 수 있다.
  // [^>]* 로 자르면 줄 가운데가 잘려 쓰레기가 남으므로, 줄 단위로 통째로 지운다.
  html = html
    .replace(/[ \t]*<link rel="canonical"[^\n]*\n?/gi, "")
    .replace(/[ \t]*<meta property="og:[^\n]*\n?/gi, "")
    .replace(/[ \t]*<meta name="twitter:[^\n]*\n?/gi, "")
    .replace(/[ \t]*<link rel="icon"[^\n]*\n?/gi, "")
    .replace(/[ \t]*<link rel="apple-touch-icon"[^\n]*\n?/gi, "");

  const depth = r.split("/").length - 1;
  const up = depth ? "../".repeat(depth) : "";
  const block = [
    // 색인하지 않는 쪽(404·폼·템플릿)에는 canonical 을 걸지 않는다
    noindex(r) ? "" : `<link rel="canonical" href="${esc(url)}">`,
    `<link rel="icon" href="${r === "404.html" ? "/" : up}favicon.svg" type="image/svg+xml">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="후하씨 huhassi">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    desc ? `<meta property="og:description" content="${esc(desc)}">` : "",
    `<meta property="og:image" content="${esc(OG_IMAGE)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`
  ].filter(Boolean);

  if (noindex(r) && !/<meta\s+name="robots"/i.test(html)) {
    block.unshift(`<meta name="robots" content="noindex">`);
  }

  // </head> 바로 앞에 넣는다
  html = html.replace(/([ \t]*)<\/head>/i, (m, indent) =>
    block.map((l) => indent + l).join("\n") + "\n" + indent + "</head>");

  if (html !== before) { fs.writeFileSync(file, html); changed++; }
  if (!noindex(r)) pages.push({ url, r });
}

// sitemap
const today = new Date().toISOString().slice(0, 10);
const priority = (r) => (r === "index.html" ? "1.0" : /^(prompts|about|license)\.html$/.test(r) ? "0.8" : "0.6");
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages
    .sort((a, b) => a.r.localeCompare(b.r))
    .map((p) => `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority(p.r)}</priority>\n  </url>`)
    .join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

fs.writeFileSync(path.join(ROOT, "robots.txt"),
`# 후하씨 huhassi
User-agent: *
Allow: /
Disallow: /api/
Disallow: /request.html

Sitemap: ${BASE}/sitemap.xml
`);

console.log(`메타 정리: ${changed}개 쪽 수정, sitemap 에 ${pages.length}개 주소`);
