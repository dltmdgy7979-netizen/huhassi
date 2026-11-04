#!/usr/bin/env node
/**
 * 공휴일 조회 MCP — Korean Holidays MCP
 * SPDX-License-Identifier: MIT
 *
 * 무엇을 하는 프로그램인가
 *   클로드(또는 다른 MCP 손님 프로그램)가 "올해 공휴일 알려줘" 처럼 물으면,
 *   공공데이터포털의 '특일정보' API 에 물어보고 그 답을 돌려줍니다.
 *
 * 쓰기 전에 꼭
 *   환경변수 HOLIDAY_API_KEY 에 공공데이터포털에서 받은
 *   '일반 인증키(Decoding)' 값을 넣어 주세요. 키가 없으면 아래 도구들이
 *   한국말로 "키가 없습니다" 하고 알려 줍니다.
 *
 * 필요한 것: Node 18 이상 (fetch 가 Node 에 들어 있는 판)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { pathToFileURL } from "node:url";

/* ───────────────────────── 설정값 ───────────────────────── */

const API_BASE =
  "http://127.0.0.1:8731/holiday";

// 키는 코드에 적지 않습니다. 반드시 환경변수로 받습니다.
const API_KEY = process.env.HOLIDAY_API_KEY || "";

// 너무 먼 연도를 묻는 걸 막습니다 (API 도 아주 먼 미래는 모릅니다).
const YEAR_MIN = 2004;
const YEAR_MAX = 2050;

// 바깥에 한 번 물어보고 기다리는 최대 시간 (밀리초)
const TIMEOUT_MS = 8000;

// 한 해가 비어 와서 달별로 열두 번 물어볼 때, 전체로 기다리는 최대 시간
const ALL_MONTH_BUDGET_MS = 30000;

/* ───────────────────── 연도별 기억(캐시) ─────────────────────
   같은 연도를 두 번 묻더라도 바깥에는 한 번만 물어봅니다.
   프로그램이 켜져 있는 동안만 기억하고, 끄면 사라집니다. */
const cache = new Map(); // "2026" → [{ date:"2026-01-01", name:"1월1일" }, ...]

/* ───────────────────────── 도우미들 ───────────────────────── */

/** 한국말로 된 오류를 만들어 줍니다. */
class 사용자오류 extends Error {}

/** 키가 없으면 여기서 멈추고 무엇을 해야 하는지 알려 줍니다. */
function 키확인() {
  if (!API_KEY.trim()) {
    throw new 사용자오류(
      [
        "공공데이터포털 인증키가 설정되어 있지 않습니다.",
        "",
        "1. data.go.kr 에 회원가입하고 로그인합니다.",
        "2. '공공데이터포털 특일정보' 를 찾아 활용 신청을 합니다.",
        "3. 승인되면 마이페이지 > 데이터활용 > 개발계정에서",
        "   '일반 인증키(Decoding)' 를 복사합니다.",
        "4. 그 값을 환경변수 HOLIDAY_API_KEY 에 넣고 프로그램을 다시 켭니다.",
      ].join("\n")
    );
  }
}

/** "20260101" 또는 20260101 → "2026-01-01" */
function 날짜모양(locdate) {
  const s = String(locdate ?? "").replace(/\D/g, "");
  if (s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** "2026-01-01" / "2026.1.1" / "20260101" 을 모두 받아 "2026-01-01" 로 */
function 날짜읽기(입력, 이름 = "날짜") {
  const s = String(입력 ?? "").trim();
  let y, m, d;

  let m1 = s.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})$/);
  let m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m1) [, y, m, d] = m1;
  else if (m2) [, y, m, d] = m2;
  else throw new 사용자오류(`${이름}를 알아볼 수 없습니다. 2026-10-03 처럼 적어 주세요.`);

  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  // 2026-02-31 같은 없는 날을 걸러냅니다.
  if (
    dt.getUTCFullYear() !== +y ||
    dt.getUTCMonth() !== +m - 1 ||
    dt.getUTCDate() !== +d
  ) {
    throw new 사용자오류(`${이름}에 없는 날이 적혀 있습니다: ${s}`);
  }
  return `${y}-${String(+m).padStart(2, "0")}-${String(+d).padStart(2, "0")}`;
}

/** 오늘 날짜를 한국 시간 기준 "2026-11-04" 로 */
function 오늘() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST = UTC+9
  return now.toISOString().slice(0, 10);
}

/** 요일 이름 */
const 요일표 = ["일", "월", "화", "수", "목", "금", "토"];
function 요일(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return 요일표[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 두 날짜가 며칠 떨어져 있는지 */
function 날수차이(a, b) {
  const t = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

function 연도확인(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < YEAR_MIN || y > YEAR_MAX) {
    throw new 사용자오류(`연도는 ${YEAR_MIN}년부터 ${YEAR_MAX}년까지만 물어볼 수 있습니다.`);
  }
  return y;
}

/* ──────────────── 바깥 API 에 물어보고 답 풀기 ──────────────── */

/**
 * 한 번 물어봅니다. 답이 JSON 이면 JSON 으로, XML 이면 XML 로 읽습니다.
 * (공공데이터포털은 가끔 _type=json 을 무시하고 XML 로 답하거나,
 *  오류를 XML 로만 돌려줍니다. 그래서 두 가지 다 읽을 수 있게 해 둡니다.)
 */
async function 한번물어보기(params) {
  const url = new URL(API_BASE);
  // 인증키는 '일반 인증키(Decoding)' 값이라 보고, 여기서 한 번 인코딩합니다.
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const 멈추개 = AbortSignal.timeout
    ? AbortSignal.timeout(TIMEOUT_MS)
    : undefined;

  let res;
  try {
    res = await fetch(url, { signal: 멈추개, headers: { Accept: "application/json" } });
  } catch (e) {
    // 시간 초과와 연결 실패는 해야 할 일이 다르므로 따로 말해 줍니다.
    const 이름 = e?.name || "";
    if (이름 === "TimeoutError" || 이름 === "AbortError") {
      throw new 사용자오류(
        `공공데이터포털이 ${Math.round(TIMEOUT_MS / 1000)}초 안에 답하지 않았습니다.\n` +
          "포털이 느린 때가 있습니다. 잠시 뒤 다시 물어봐 주세요."
      );
    }
    throw new 사용자오류(
      "공공데이터포털에 연결하지 못했습니다.\n" +
        "인터넷 연결, 또는 회사·학교 방화벽에 막혀 있는지 확인해 주세요.\n" +
        `(자세한 내용: ${e?.message || e})`
    );
  }

  let 본문 = "";
  try {
    본문 = await res.text();
  } catch {
    본문 = "";
  }

  if (!res.ok) {
    // 포털은 오류일 때도 본문에 까닭(resultCode)을 적어 보내는 때가 있습니다.
    // 그 까닭이 있으면 HTTP 번호보다 그쪽이 훨씬 쓸모 있으니 먼저 읽어 봅니다.
    try {
      항목뽑기(본문);
    } catch (e) {
      if (e instanceof 사용자오류) throw e;
    }
    throw new 사용자오류(HTTP오류말(res.status));
  }

  return 항목뽑기(본문);
}

/** HTTP 번호마다 해야 할 일이 다르니 다르게 말해 줍니다. */
function HTTP오류말(상태) {
  const 번호 = Number(상태);
  if (번호 === 401 || 번호 === 403) {
    return (
      `공공데이터포털이 인증을 거절했습니다 (HTTP ${번호}).\n` +
      "1. '일반 인증키(Decoding)' 를 넣었는지 확인해 주세요. Encoding 쪽이면 작동하지 않습니다.\n" +
      "2. 키 앞뒤에 빈칸이나 줄바꿈이 끼어 있지 않은지 확인해 주세요.\n" +
      "3. 마이페이지에서 '특일 정보' 활용신청이 승인(개발계정)되었는지 확인해 주세요."
    );
  }
  if (번호 === 404) {
    return (
      `요청한 주소를 포털에서 찾지 못했습니다 (HTTP 404).\n` +
      "포털이 서비스 주소를 바꾼 때입니다. 이 프로그램의 새 판이 필요할 수 있습니다."
    );
  }
  if (번호 === 429) {
    return (
      "오늘 또는 지금 쓸 수 있는 횟수를 넘겼습니다 (HTTP 429).\n" +
      "잠시 뒤, 또는 내일 다시 물어봐 주세요."
    );
  }
  if (번호 >= 500) {
    return (
      `공공데이터포털 쪽에서 문제가 났습니다 (HTTP ${번호}).\n` +
      "내 설정 문제가 아닙니다. 잠시 뒤 다시 물어봐 주세요."
    );
  }
  return (
    `공공데이터포털이 오류로 답했습니다 (HTTP ${번호}).\n` +
    "인증키가 맞는지, 활용 신청이 승인되었는지 확인해 주세요."
  );
}

/**
 * 받은 본문에서 공휴일 목록을 뽑습니다.
 * JSON 이든 XML 이든, 모양이 조금 달라도 터지지 않게 조심조심 읽습니다.
 */
function 항목뽑기(본문) {
  const 글 = String(본문 || "").trim();
  if (!글) return [];

  // 1) 먼저 JSON 으로 읽어 봅니다.
  if (글.startsWith("{") || 글.startsWith("[")) {
    let j;
    try {
      j = JSON.parse(글);
    } catch {
      j = null;
    }
    if (j) {
      const 머리 = j?.response?.header;
      const 코드 = 머리?.resultCode;
      // "00" 이 아니면 포털이 보낸 오류입니다.
      if (코드 && String(코드) !== "00") {
        throw new 사용자오류(포털오류말(코드, 머리?.resultMsg));
      }
      const it = j?.response?.body?.items?.item;
      const 목록 = Array.isArray(it) ? it : it ? [it] : [];
      return 목록.map(한줄정리).filter(Boolean);
    }
  }

  // 2) XML 로 읽어 봅니다 (바깥 라이브러리 없이, 필요한 조각만 집어냅니다).
  const 코드 = 글.match(/<resultCode>\s*([^<]*)<\/resultCode>/)?.[1]?.trim();
  if (코드 && 코드 !== "00") {
    const 말 = 글.match(/<resultMsg>\s*([^<]*)<\/resultMsg>/)?.[1]?.trim();
    throw new 사용자오류(포털오류말(코드, 말));
  }
  // 인증키가 틀리면 아예 다른 모양의 XML 이 옵니다.
  if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE ERROR/i.test(글)) {
    throw new 사용자오류(
      "인증키가 등록되지 않은 키라고 합니다.\n" +
        "'일반 인증키(Decoding)' 값을 그대로 넣었는지, 승인이 끝났는지 확인해 주세요."
    );
  }

  const 결과 = [];
  const 덩어리 = 글.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const one of 덩어리) {
    const 골라내기 = (태그) =>
      one.match(new RegExp(`<${태그}>\\s*([^<]*)<\\/${태그}>`))?.[1]?.trim();
    const 정리 = 한줄정리({
      locdate: 골라내기("locdate"),
      dateName: 골라내기("dateName"),
      isHoliday: 골라내기("isHoliday"),
    });
    if (정리) 결과.push(정리);
  }
  return 결과;
}

/** 항목 하나를 { date, name } 으로. 쉬는 날이 아니면 버립니다. */
function 한줄정리(raw) {
  if (!raw || typeof raw !== "object") return null;
  const date = 날짜모양(raw.locdate);
  if (!date) return null;
  // isHoliday 가 'Y' 인 것만 '쉬는 날' 입니다. 칸이 없으면 쉬는 날로 봅니다.
  const 쉼 = raw.isHoliday == null ? "Y" : String(raw.isHoliday).trim().toUpperCase();
  if (쉼 !== "Y") return null;
  const name = String(raw.dateName ?? "").trim() || "공휴일";
  return { date, name };
}

function 포털오류말(코드, 말) {
  const 짝 = {
    "01": "포털에 적용되지 않은 서비스키입니다. 승인 여부를 확인해 주세요.",
    "02": "포털이 지금 점검 중이거나 일시적으로 답하지 못합니다. 잠시 뒤 다시 해 보세요.",
    "04": "요청한 값에 빠진 칸이 있습니다.",
    "12": "없어진 서비스입니다.",
    "20": "서비스 접근이 거부되었습니다. 활용 신청 상태를 확인해 주세요.",
    "22": "오늘 쓸 수 있는 횟수를 모두 썼습니다. 내일 다시 해 보세요.",
    "30": "등록되지 않은 인증키입니다. '일반 인증키(Decoding)' 값을 다시 확인해 주세요.",
    "31": "기한이 끝난 인증키입니다. 포털에서 연장해 주세요.",
  };
  const 설명 = 짝[String(코드)] || 말 || "알 수 없는 오류";
  return `공공데이터포털이 오류로 답했습니다 (코드 ${코드}).\n${설명}`;
}

/**
 * 한 해의 공휴일을 모두 가져옵니다. 한 번 가져온 해는 기억해 둡니다.
 * 연도만 넣어도 한 해가 다 오지만, 혹시 비어 오면 달별로 열두 번 물어봅니다.
 */
async function 연도공휴일(year) {
  const 키 = String(year);
  if (cache.has(키)) return cache.get(키);

  키확인();

  let 목록 = await 한번물어보기({ solYear: year });

  if (목록.length === 0) {
    // 달별로 다시 물어봅니다. 다만 열두 번을 끝없이 기다리지 않도록
    // 전체 시간에 상한을 둡니다 (느린 날 대화창이 멈춘 듯 보이는 것을 막습니다).
    const 끝낼때 = Date.now() + ALL_MONTH_BUDGET_MS;
    for (let m = 1; m <= 12; m++) {
      if (Date.now() > 끝낼때) break;
      const 한달 = await 한번물어보기({
        solYear: year,
        solMonth: String(m).padStart(2, "0"),
      });
      목록 = 목록.concat(한달);
    }
  }

  // 같은 날이 두 번 오는 경우가 있어 하나로 묶고, 날짜순으로 줄 세웁니다.
  const 묶음 = new Map();
  for (const h of 목록) {
    if (!묶음.has(h.date)) 묶음.set(h.date, h);
  }
  const 정렬 = [...묶음.values()].sort((a, b) => a.date.localeCompare(b.date));

  // 비어 있는 답은 기억하지 않습니다. 한 번 비어 왔다고
  // 프로그램이 켜져 있는 동안 계속 "없다"고 하면 안 되니까요.
  if (정렬.length > 0) cache.set(키, 정렬);
  return 정렬;
}

/* ──────────────────────── 도구 목록 ──────────────────────── */

const TOOLS = [
  {
    name: "list_holidays",
    description:
      "한 해(또는 한 해의 한 달) 한국 공휴일 목록을 돌려줍니다. " +
      "Lists Korean public holidays for a year, optionally narrowed to one month.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          description: `연도. 예: 2026 (${YEAR_MIN}~${YEAR_MAX})`,
        },
        month: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "달. 비워 두면 그 해 전체를 돌려줍니다.",
        },
      },
      required: ["year"],
    },
  },
  {
    name: "is_holiday",
    description:
      "어떤 날이 공휴일인지 예/아니오로 답하고, 공휴일이면 이름도 알려 줍니다. " +
      "Says whether a given date is a public holiday, and names it.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "날짜. 2026-10-03 처럼 적습니다.",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "next_holiday",
    description:
      "어떤 날을 기준으로 다음 공휴일이 언제이고 며칠 뒤인지 알려 줍니다. " +
      "Finds the next public holiday from a date and how many days away it is.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "기준 날짜. 비워 두면 오늘(한국 시간)로 봅니다.",
        },
      },
    },
  },
];

/* ───────────────────── 도구가 하는 일 ───────────────────── */

async function 도구실행(name, args = {}) {
  if (name === "list_holidays") {
    const year = 연도확인(args.year);

    // 넣은 값은 바깥에 물어보기 **전에** 모두 확인합니다.
    // (틀린 값으로 포털에 묻고 나서 거절하면 횟수만 버리게 됩니다.)
    let 달 = null;
    if (args.month != null && args.month !== "") {
      const m = Number(args.month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        throw new 사용자오류("달은 1부터 12까지의 숫자로 적어 주세요.");
      }
      달 = m;
    }

    const 전체 = await 연도공휴일(year);

    // 한 해가 통째로 비어 오는 것은 '쉬는 날이 없다'가 아니라 '자료를 못 받았다' 쪽입니다.
    if (전체.length === 0) {
      return (
        `${year}년 공휴일 자료를 한 건도 받지 못했습니다.\n` +
        "포털이 그 해 자료를 아직 올리지 않았거나, 답이 비어 온 경우입니다.\n" +
        "가까운 연도(예: 올해)로 한 번 물어봐 확인해 주세요."
      );
    }

    let 목록 = 전체;
    let 머리말 = `${year}년 공휴일 ${전체.length}일`;

    if (달 != null) {
      const 앞 = `${year}-${String(달).padStart(2, "0")}`;
      목록 = 전체.filter((h) => h.date.startsWith(앞));
      머리말 = `${year}년 ${달}월 공휴일 ${목록.length}일`;
    }

    if (목록.length === 0) return `${머리말} — 쉬는 날이 없습니다.`;

    return (
      머리말 +
      "\n" +
      목록.map((h) => `- ${h.date} (${요일(h.date)}) ${h.name}`).join("\n")
    );
  }

  if (name === "is_holiday") {
    const date = 날짜읽기(args.date, "날짜");
    const year = 연도확인(date.slice(0, 4));
    const 전체 = await 연도공휴일(year);
    const 요일말 = `${date} (${요일(date)})`;

    // 자료가 아예 비어 왔는데 "공휴일 아닙니다" 라고 답하면 거짓말이 됩니다.
    if (전체.length === 0) {
      return (
        `${year}년 공휴일 자료를 받지 못해, ${요일말}이 공휴일인지 확인하지 못했습니다.\n` +
        "잠시 뒤 다시 물어봐 주세요."
      );
    }

    const 찾음 = 전체.find((h) => h.date === date);
    if (찾음) return `네, ${요일말}은 공휴일입니다. 이름은 '${찾음.name}' 입니다.`;

    const 주말 = ["토", "일"].includes(요일(date));
    return (
      `아니요, ${요일말}은 법정 공휴일이 아닙니다.` +
      (주말 ? " 다만 주말입니다." : "")
    );
  }

  if (name === "next_holiday") {
    const 기준 = args.from ? 날짜읽기(args.from, "기준 날짜") : 오늘();
    const year = 연도확인(기준.slice(0, 4));

    // 올해에서 찾고, 없으면 다음 해에서 찾습니다.
    let 찾음 = (await 연도공휴일(year)).find((h) => h.date > 기준);
    if (!찾음 && year + 1 <= YEAR_MAX) {
      찾음 = (await 연도공휴일(year + 1))[0];
    }
    if (!찾음) return `${기준} 이후의 공휴일 자료를 찾지 못했습니다.`;

    const 며칠 = 날수차이(기준, 찾음.date);
    return (
      `${기준} 기준으로 다음 공휴일은 ` +
      `${찾음.date} (${요일(찾음.date)}) '${찾음.name}' 이고, ${며칠}일 뒤입니다.`
    );
  }

  throw new 사용자오류(`모르는 도구입니다: ${name}`);
}

/* ───────────── 안을 들여다볼 수 있게 내보내기 ─────────────
   답을 풀어내는 부분만 따로 시험해 볼 수 있도록 내보냅니다.
   (MCP 손님 프로그램은 이걸 쓰지 않습니다. 시험용입니다.) */
export const 내부 = { 항목뽑기, 포털오류말, HTTP오류말, 날짜읽기, 요일, 날수차이 };

/* ─────────────────────── MCP 서버 켜기 ─────────────────────── */

const server = new Server(
  { name: "korean-holidays", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// "어떤 도구가 있니?" 라고 물으면 위 목록을 보여 줍니다.
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// "이 도구 좀 써 줘" 라고 하면 여기서 처리합니다.
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const 글 = await 도구실행(name, args || {});
    return { content: [{ type: "text", text: 글 }] };
  } catch (e) {
    // 터지게 두지 않고, 한국말 설명을 돌려줍니다.
    const 말 =
      e instanceof 사용자오류
        ? e.message
        : `뜻밖의 문제가 생겼습니다: ${e?.message || e}`;
    return { content: [{ type: "text", text: 말 }], isError: true };
  }
});

// 이 파일을 직접 실행했을 때만 서버를 켭니다.
// (시험 코드가 import 로 불러올 때는 켜지 않습니다.)
const 직접실행 =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (직접실행) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout 은 MCP 가 쓰는 길이라 아무것도 적지 않습니다. 알림은 stderr 로.
  process.stderr.write("공휴일 조회 MCP 가 준비되었습니다.\n");
}
