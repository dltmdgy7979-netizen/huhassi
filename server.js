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
  const trim = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const row = {
    name: trim(data.name, 100),
    contact: trim(data.contact, 200),
    kind: trim(data.kind, 50),
    body: trim(data.body, 4000),
    lang: data.lang === "en" ? "en" : "ko",
    source: "huhassi-site",
    status: "new"
  };
  if (row.contact.length < 3 || row.body.length < 5) return json(res, 400, { error: "too_short" });

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

async function collect(dir, base, out) {
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) await collect(full, rel, out);
    else if (entry.isFile()) out.push({ name: rel, data: await fsp.readFile(full) });
  }
  return out;
}

async function handleZip(res, slug) {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return send(res, 400, "Bad name");
  const candidates = [path.join(ROOT, "demos", slug), path.join(ROOT, "mcp", slug)];
  let dir = null;
  for (const c of candidates) {
    try { if ((await fsp.stat(c)).isDirectory()) { dir = c; break; } } catch {}
  }
  if (!dir) return send(res, 404, "Not found");

  const entries = await collect(dir, slug, []);
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
    try { return await handleZip(res, zipMatch[1]); }
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
