#!/usr/bin/env node
/**
 * 로컬 메모 MCP — Local Notes MCP
 * SPDX-License-Identifier: MIT
 *
 * 무엇을 하는 프로그램인가
 *   내 컴퓨터 안의 메모 폴더(.md, .txt)를 찾아보고 읽어서 클로드에게 건네줍니다.
 *   바깥으로 아무것도 보내지 않습니다. 디스크에서 읽기만 합니다.
 *
 * 쓰기 전에 꼭
 *   환경변수 NOTES_DIR 에 메모가 들어 있는 폴더 경로를 넣어 주세요.
 *
 * 안전 장치 (중요)
 *   - 모든 경로를 실제 경로로 풀어서, 메모 폴더 밖이면 거절합니다.
 *     '..' 로 빠져나가는 것도, 바로가기(심볼릭 링크)로 빠져나가는 것도 막습니다.
 *   - .md 와 .txt 만 읽습니다.
 *   - 파일 하나의 크기, 한 번에 돌려주는 개수에 모두 상한을 둡니다.
 *   - 쓰기·지우기 기능이 아예 없습니다. 읽기만 합니다.
 *
 * 필요한 것: Node 18 이상
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import fs from "node:fs/promises";
import path from "node:path";

/* ───────────────────────── 설정값 ───────────────────────── */

const RAW_DIR = process.env.NOTES_DIR || "";

const 허용확장자 = new Set([".md", ".txt"]);

const MAX_FILE_BYTES = 512 * 1024;   // 파일 하나 최대 512KB
const MAX_READ_CHARS = 60000;        // read_note 가 돌려줄 최대 글자수
const MAX_WALK_FILES = 4000;         // 폴더를 훑을 때 최대 파일 수
const MAX_WALK_DEPTH = 8;            // 폴더 깊이 상한
const MAX_HITS = 40;                 // 검색 결과 최대 개수
const MAX_HITS_PER_FILE = 3;         // 파일 하나에서 최대 몇 줄까지
const SNIPPET_PAD = 60;              // 찾은 말 앞뒤로 보여 줄 글자수

/* ───────────────────────── 도우미들 ───────────────────────── */

class 사용자오류 extends Error {}

/** 실제 경로로 풀어 둔 메모 폴더. 한 번만 구하고 기억합니다. */
let 뿌리 = null;

async function 뿌리구하기() {
  if (뿌리) return 뿌리;

  if (!RAW_DIR.trim()) {
    throw new 사용자오류(
      [
        "메모 폴더가 설정되어 있지 않습니다.",
        "",
        "설정 파일(claude_desktop_config.json)의 env 칸에",
        'NOTES_DIR 을 메모 폴더 경로로 넣고 클로드를 다시 켜 주세요.',
        '예: "NOTES_DIR": "/Users/내이름/메모"',
      ].join("\n")
    );
  }

  let 풀린경로;
  try {
    // realpath: 바로가기(심볼릭 링크)까지 끝까지 따라가 진짜 경로를 구합니다.
    풀린경로 = await fs.realpath(path.resolve(RAW_DIR));
  } catch {
    throw new 사용자오류(
      `메모 폴더를 찾을 수 없습니다: ${RAW_DIR}\n경로를 다시 확인해 주세요.`
    );
  }

  const st = await fs.stat(풀린경로);
  if (!st.isDirectory()) {
    throw new 사용자오류(`메모 폴더로 적은 곳이 폴더가 아닙니다: ${RAW_DIR}`);
  }

  뿌리 = 풀린경로;
  return 뿌리;
}

/**
 * 밖에서 받은 상대 경로를, 메모 폴더 안의 실제 파일 경로로 바꿉니다.
 * 조금이라도 폴더 밖을 가리키면 거절합니다. ← 여기가 가장 중요한 부분입니다.
 */
async function 안전한경로(상대) {
  const root = await 뿌리구하기();
  const s = String(상대 ?? "").trim();

  if (!s) throw new 사용자오류("읽을 파일 경로를 적어 주세요.");
  if (s.includes("\0")) throw new 사용자오류("경로에 쓸 수 없는 글자가 있습니다.");
  if (path.isAbsolute(s)) {
    throw new 사용자오류("메모 폴더 기준의 상대 경로로 적어 주세요. (예: 일기/2026-01.md)");
  }

  // 1차: 글자 수준에서 합쳐 보고 뿌리 안인지 봅니다.
  const 합친경로 = path.resolve(root, s);
  if (!안에있나(root, 합친경로)) {
    throw new 사용자오류("메모 폴더 밖은 읽을 수 없습니다.");
  }

  // 2차: 실제 경로(바로가기를 다 따라간 경로)로 다시 확인합니다.
  //      바로가기로 폴더 밖을 가리키는 경우를 이 단계에서 잡습니다.
  let 진짜;
  try {
    진짜 = await fs.realpath(합친경로);
  } catch {
    throw new 사용자오류(`그런 파일이 없습니다: ${s}`);
  }
  if (!안에있나(root, 진짜)) {
    throw new 사용자오류("바로가기가 메모 폴더 밖을 가리킵니다. 읽지 않았습니다.");
  }

  // 확장자 확인
  if (!허용확장자.has(path.extname(진짜).toLowerCase())) {
    throw new 사용자오류(".md 와 .txt 파일만 읽습니다.");
  }

  const st = await fs.stat(진짜);
  if (!st.isFile()) throw new 사용자오류("파일이 아닙니다.");
  if (st.size > MAX_FILE_BYTES) {
    throw new 사용자오류(
      `파일이 너무 큽니다 (${Math.round(st.size / 1024)}KB). ` +
        `${Math.round(MAX_FILE_BYTES / 1024)}KB 까지만 읽습니다.`
    );
  }

  return { 진짜, 상대경로: path.relative(root, 진짜), 크기: st.size, 고친때: st.mtime };
}

/** 어떤 경로가 뿌리 폴더 안에 있나? (뿌리 자신도 안으로 봅니다) */
function 안에있나(root, 대상) {
  if (대상 === root) return true;
  const rel = path.relative(root, 대상);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** 숨김 폴더·흔한 쓰레기 폴더는 건너뜁니다. */
function 건너뛸폴더(이름) {
  if (이름.startsWith(".")) return true;
  return ["node_modules", "__pycache__", "venv", "dist", "build"].includes(이름);
}

/**
 * 메모 폴더를 훑어 .md/.txt 파일 목록을 모읍니다.
 * 바로가기는 따라가지 않습니다 (빙빙 도는 것과 폴더 밖 탈출을 둘 다 막습니다).
 */
async function 파일모으기() {
  const root = await 뿌리구하기();
  const 모음 = [];

  async function 들어가기(여기, 깊이) {
    if (깊이 > MAX_WALK_DEPTH || 모음.length >= MAX_WALK_FILES) return;

    let 목록;
    try {
      목록 = await fs.readdir(여기, { withFileTypes: true });
    } catch {
      return; // 못 읽는 폴더는 조용히 넘어갑니다.
    }

    for (const e of 목록) {
      if (모음.length >= MAX_WALK_FILES) return;
      const 전체 = path.join(여기, e.name);

      if (e.isSymbolicLink()) continue;          // 바로가기는 아예 건드리지 않음
      if (e.isDirectory()) {
        if (건너뛸폴더(e.name)) continue;
        await 들어가기(전체, 깊이 + 1);
        continue;
      }
      if (!e.isFile()) continue;
      if (e.name.startsWith(".")) continue;
      if (!허용확장자.has(path.extname(e.name).toLowerCase())) continue;

      let st;
      try {
        st = await fs.stat(전체);
      } catch {
        continue;
      }
      if (st.size > MAX_FILE_BYTES) continue;

      모음.push({
        상대경로: path.relative(root, 전체),
        전체경로: 전체,
        크기: st.size,
        고친때: st.mtime,
      });
    }
  }

  await 들어가기(root, 0);
  return 모음;
}

/** "2026-11-04 13:20" 모양으로 */
function 때글자(d) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}`
  );
}

/** 보여 줄 조각에서 줄바꿈·연속 공백을 정리합니다. */
function 한줄로(s) {
  return s.replace(/\s+/g, " ").trim();
}

/* ──────────────────────── 도구 목록 ──────────────────────── */

const TOOLS = [
  {
    name: "search_notes",
    description:
      "메모 폴더에서 낱말을 찾아, 찾은 파일·줄 번호·앞뒤 조각을 돌려줍니다. " +
      "Searches the notes folder and returns matching files with a line number and a snippet.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "찾을 낱말이나 구절" },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: MAX_HITS,
          description: `돌려줄 결과 개수 (최대 ${MAX_HITS}, 기본 20)`,
        },
      },
      required: ["keyword"],
    },
  },
  {
    name: "read_note",
    description:
      "메모 파일 하나를 읽어 내용을 돌려줍니다. 메모 폴더 기준 상대 경로를 넣습니다. " +
      "Reads one note file, given its path relative to the notes folder.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "메모 폴더 기준 상대 경로. 예: 일기/2026-01.md",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "list_notes",
    description:
      "최근에 고친 메모 파일 목록을 고친 날짜와 함께 돌려줍니다. " +
      "Lists note files, most recently modified first, with their dates.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "돌려줄 개수 (최대 200, 기본 30)",
        },
      },
    },
  },
];

/* ───────────────────── 도구가 하는 일 ───────────────────── */

async function 도구실행(name, args = {}) {
  if (name === "search_notes") {
    const 낱말 = String(args.keyword ?? "").trim();
    if (!낱말) throw new 사용자오류("찾을 낱말을 적어 주세요.");
    if (낱말.length > 200) throw new 사용자오류("찾을 낱말이 너무 깁니다.");

    const 상한 = Math.min(Math.max(Number(args.limit) || 20, 1), MAX_HITS);
    const 낱말소문자 = 낱말.toLowerCase();

    const 파일들 = await 파일모으기();
    // 최근에 고친 것부터 봅니다.
    파일들.sort((a, b) => b.고친때 - a.고친때);

    const 결과 = [];
    for (const f of 파일들) {
      if (결과.length >= 상한) break;

      let 글;
      try {
        글 = await fs.readFile(f.전체경로, "utf8");
      } catch {
        continue;
      }

      const 줄들 = 글.split(/\r?\n/);
      let 이파일에서 = 0;
      for (let i = 0; i < 줄들.length; i++) {
        if (결과.length >= 상한 || 이파일에서 >= MAX_HITS_PER_FILE) break;
        const 줄 = 줄들[i];
        const 위치 = 줄.toLowerCase().indexOf(낱말소문자);
        if (위치 === -1) continue;

        const 앞 = Math.max(0, 위치 - SNIPPET_PAD);
        const 뒤 = Math.min(줄.length, 위치 + 낱말.length + SNIPPET_PAD);
        const 조각 =
          (앞 > 0 ? "…" : "") + 한줄로(줄.slice(앞, 뒤)) + (뒤 < 줄.length ? "…" : "");

        결과.push({ 파일: f.상대경로, 줄번호: i + 1, 조각 });
        이파일에서++;
      }
    }

    if (결과.length === 0) {
      return `'${낱말}' 을 담은 메모를 찾지 못했습니다. (살펴본 파일 ${파일들.length}개)`;
    }

    return (
      `'${낱말}' 검색 결과 ${결과.length}건 (살펴본 파일 ${파일들.length}개)\n` +
      결과.map((r) => `- ${r.파일}:${r.줄번호}\n  ${r.조각}`).join("\n")
    );
  }

  if (name === "read_note") {
    const { 진짜, 상대경로, 크기, 고친때 } = await 안전한경로(args.path);

    let 글 = await fs.readFile(진짜, "utf8");
    let 잘림 = "";
    if (글.length > MAX_READ_CHARS) {
      글 = 글.slice(0, MAX_READ_CHARS);
      잘림 = `\n\n…(길어서 앞 ${MAX_READ_CHARS}글자만 보여 드립니다)`;
    }

    return (
      `파일: ${상대경로}\n` +
      `크기: ${Math.max(1, Math.round(크기 / 1024))}KB · 고친 때: ${때글자(고친때)}\n` +
      `${"─".repeat(28)}\n` +
      글 +
      잘림
    );
  }

  if (name === "list_notes") {
    const 상한 = Math.min(Math.max(Number(args.limit) || 30, 1), 200);
    const 파일들 = await 파일모으기();

    if (파일들.length === 0) {
      const root = await 뿌리구하기();
      return `메모 폴더에 .md 또는 .txt 파일이 없습니다.\n폴더: ${root}`;
    }

    파일들.sort((a, b) => b.고친때 - a.고친때);
    const 보여줄것 = 파일들.slice(0, 상한);

    return (
      `메모 ${파일들.length}개 중 최근 ${보여줄것.length}개\n` +
      보여줄것
        .map(
          (f) =>
            `- ${f.상대경로} · ${때글자(f.고친때)} · ` +
            `${Math.max(1, Math.round(f.크기 / 1024))}KB`
        )
        .join("\n")
    );
  }

  throw new 사용자오류(`모르는 도구입니다: ${name}`);
}

/* ─────────────────────── MCP 서버 켜기 ─────────────────────── */

const server = new Server(
  { name: "local-notes", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const 글 = await 도구실행(name, args || {});
    return { content: [{ type: "text", text: 글 }] };
  } catch (e) {
    const 말 =
      e instanceof 사용자오류
        ? e.message
        : `뜻밖의 문제가 생겼습니다: ${e?.message || e}`;
    return { content: [{ type: "text", text: 말 }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
// stdout 은 MCP 가 쓰는 길이라 아무것도 적지 않습니다. 알림은 stderr 로.
process.stderr.write("로컬 메모 MCP 가 준비되었습니다.\n");
