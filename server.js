/* 후하씨 huhassi — 작은 서버
   - public/ 아래 파일을 그대로 내보냅니다
   - POST /api/request : 신청 폼을 Supabase(huhassi_requests)에 저장
   - GET  /api/zip/<폴더>.zip : 데모 한 벌을 ZIP 으로 내려받기
   바깥 라이브러리 없음 (node 기본 모듈만)
   SPDX-License-Identifier: MIT */
const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { makeZip } = require("./lib/zip");

const ROOT = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const TABLE = process.env.SUPABASE_TABLE || "huhassi_requests";
// 이 프로젝트는 REST 기본 스키마가 public 이 아니므로 스키마를 명시해야 합니다.
const SCHEMA = process.env.SUPABASE_SCHEMA || "public";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
  ".zip": "application/zip", ".webmanifest": "application/manifest+json"
};

function send(res, code, body, type, extra) {
  const headers = Object.assign({
    "Content-Type": type || "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
    "Cache-Control": code === 200 ? "public, max-age=300" : "no-store"
  }, extra || {});
  res.writeHead(code, headers);
  res.end(body);
}
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), TYPES[".json"]);

/* ---- 같은 사람이 너무 자주 보내지 못하게 (메모리에만 둡니다) ---- */
const hits = new Map();
function tooMany(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 5;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  if (list.length >= max) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}
const clientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket.remoteAddress || "?";

function readBody(req, limit = 20000) {
  return new Promise((resolve, reject) => {
    let n = 0; const parts = [];
    req.on("data", (c) => {
      n += c.length;
      if (n > limit) { reject(new Error("too big")); req.destroy(); return; }
      parts.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleRequestForm(req, res) {
  if (tooMany(clientIp(req))) return json(res, 429, { error: "too_many" });
  let data;
  try { data = JSON.parse(await readBody(req)); }
  catch { return json(res, 400, { error: "bad_json" }); }

  if (data.website) return json(res, 200, { ok: true });           // 로봇용 미끼 칸
  if (data.consent !== true) return json(res, 400, { error: "no_consent" });
  const trim = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const row = {
    name: trim(data.name, 100),
    contact: trim(data.contact, 200),
    kind: trim(data.kind, 50),
    body: trim(data.body, 4000),
    lang: data.lang === "en" ? "en" : "ko",
    source: "huhassi-site",
    status: "new",
    consent_at: new Date().toISOString()
  };
  if (row.contact.length < 3 || row.body.length < 5) return json(res, 400, { error: "too_short" });
  const reachable =
    /^https?:\/\/\S+\.\S+/i.test(row.contact) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(row.contact) ||
    /^@[A-Za-z0-9._]{2,}$/.test(row.contact);
  if (!reachable) return json(res, 400, { error: "bad_contact" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[huhassi] SUPABASE_URL / SUPABASE_KEY 가 없어 신청을 저장하지 못했습니다.");
    return json(res, 503, { error: "not_configured" });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Content-Profile": SCHEMA,
        "Accept-Profile": SCHEMA,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) {
      console.error("[huhassi] supabase", r.status, (await r.text()).slice(0, 400));
      return json(res, 502, { error: "store_failed" });
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("[huhassi] supabase 연결 실패", e.message);
    return json(res, 502, { error: "store_failed" });
  }
}

/* ZIP 에 넣지 않는 것 — 누가 데모 폴더에서 npm install 을 해도 5MB 짜리가 되지 않게 */
const ZIP_SKIP_DIRS = new Set(["node_modules", ".git", ".cache", "dist", "build", ".next", "__pycache__"]);
const ZIP_SKIP_FILES = new Set(["package-lock.json", ".DS_Store", "yarn.lock", "pnpm-lock.yaml"]);
const ZIP_MAX_BYTES = 8 * 1024 * 1024;

async function collect(dir, base, out, state) {
  state = state || { bytes: 0, skipped: [] };
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (ZIP_SKIP_DIRS.has(entry.name)) { state.skipped.push(rel + "/"); continue; }
      await collect(full, rel, out, state);
    } else if (entry.isFile()) {
      if (ZIP_SKIP_FILES.has(entry.name) || entry.name.endsWith(".log")) { state.skipped.push(rel); continue; }
      const stat = await fsp.stat(full);
      if (state.bytes + stat.size > ZIP_MAX_BYTES) { state.skipped.push(rel); continue; }
      state.bytes += stat.size;
      out.push({ name: rel, data: await fsp.readFile(full) });
    }
  }
  out.__state = state;
  return out;
}

/* ZIP 안에서는 폴더가 한 단계 얕아집니다(<slug>/index.html + <slug>/assets/).
   사이트에서 쓰던 ../../ 경로를 그대로 두면 받아서 열었을 때 CSS 가 전부 404 납니다. */
function rewriteForZip(html, siteBase) {
  return html
    .replace(/\.\.\/\.\.\/assets\//g, "assets/")
    .replace(/(href|src)="\.\.\/\.\.\/([^"]*)"/g, (m, attr, rest) => `${attr}="${siteBase}/${rest}"`);
}

async function handleZip(res, slug, siteBase) {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return send(res, 400, "Bad name");
  const candidates = [path.join(ROOT, "demos", slug), path.join(ROOT, "mcp", slug)];
  let dir = null;
  for (const c of candidates) {
    try { if ((await fsp.stat(c)).isDirectory()) { dir = c; break; } } catch {}
  }
  if (!dir) return send(res, 404, "Not found");

  const entries = await collect(dir, slug, []);
  for (const e of entries) {
    if (e.name.endsWith(".html")) {
      e.data = Buffer.from(rewriteForZip(e.data.toString("utf8"), siteBase), "utf8");
    }
  }
  if (entries.__state && entries.__state.skipped.length) {
    console.log("[huhassi] zip " + slug + " 에서 제외: " + entries.__state.skipped.join(", "));
  }
  for (const extra of [
    { from: path.join(__dirname, "LICENSE"), as: slug + "/LICENSE" },
    { from: path.join(ROOT, "assets", "base.css"), as: slug + "/assets/base.css" },
    { from: path.join(ROOT, "assets", "demo.css"), as: slug + "/assets/demo.css" },
    { from: path.join(ROOT, "assets", "i18n.js"), as: slug + "/assets/i18n.js" }
  ]) {
    try { entries.push({ name: extra.as, data: await fsp.readFile(extra.from) }); } catch {}
  }
  const zip = makeZip(entries);
  send(res, 200, zip, TYPES[".zip"], {
    "Content-Disposition": `attachment; filename="huhassi-${slug}.zip"`,
    "Cache-Control": "public, max-age=60"
  });
}

const server = http.createServer(async (req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { return send(res, 400, "Bad request"); }

  if (urlPath === "/api/request") {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    try { return await handleRequestForm(req, res); }
    catch (e) { console.error(e); return json(res, 500, { error: "server" }); }
  }
  if (urlPath === "/healthz") return json(res, 200, { ok: true });

  const zipMatch = urlPath.match(/^\/api\/zip\/([a-z0-9-]+)\.zip$/);
  if (zipMatch) {
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    const siteBase = host ? `${proto}://${host}` : "";
    try { return await handleZip(res, zipMatch[1], siteBase); }
    catch (e) { console.error(e); return send(res, 500, "Server error"); }
  }

  if (urlPath.endsWith("/")) urlPath += "index.html";
  const target = path.join(ROOT, path.normalize(urlPath));
  if (!target.startsWith(ROOT)) return send(res, 403, "Forbidden");

  fs.stat(target, (err, stat) => {
    if (err || stat.isDirectory()) {
      return fs.readFile(target + ".html", (e2, buf) => {
        if (!e2) return send(res, 200, buf, TYPES[".html"]);
        fs.readFile(path.join(ROOT, "404.html"), (e3, nf) =>
          e3 ? send(res, 404, "Not found") : send(res, 404, nf, TYPES[".html"]));
      });
    }
    fs.readFile(target, (e, buf) => {
      if (e) return send(res, 500, "Server error");
      send(res, 200, buf, TYPES[path.extname(target).toLowerCase()] || "application/octet-stream");
    });
  });
});

server.listen(PORT, () => {
  console.log("huhassi on " + PORT);
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[huhassi] SUPABASE_URL / SUPABASE_KEY 가 비어 있습니다 — 신청 폼이 저장되지 않습니다.");
  }
});
