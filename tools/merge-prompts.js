/* content/prompts-*.json 을 public/demos.json 의 프롬프트 항목에 합칩니다.
   쓰는 법: node tools/merge-prompts.js
   SPDX-License-Identifier: MIT */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEMOS = path.join(ROOT, "public", "demos.json");
const SRC = ["content/prompts-16-27.json", "content/prompts-28-40.json"];

const doc = JSON.parse(fs.readFileSync(DEMOS, "utf8"));
const byN = new Map(doc.items.map((i) => [i.n, i]));

let merged = 0, missing = [];
for (const rel of SRC) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) { missing.push(rel); continue; }
  const incoming = JSON.parse(fs.readFileSync(f, "utf8")).items || [];
  for (const p of incoming) {
    const old = byN.get(p.n);
    if (!old) { console.warn("번호 " + p.n + " 가 demos.json 에 없습니다 — 건너뜀"); continue; }
    if (old.cat !== "prompt") { console.warn("번호 " + p.n + " 는 프롬프트가 아닙니다 — 건너뜀"); continue; }
    // 번호·주소·가격 칸은 그대로 두고 내용만 바꾼다
    old.group = p.group || old.group;
    for (const lang of ["ko", "en"]) {
      const src = p[lang];
      if (!src) continue;
      old[lang] = {
        title: src.title,
        desc: src.desc,
        when: src.when || "",
        prompt: src.prompt,
        example: src.example && src.example.input ? { input: src.example.input, output: src.example.output } : null,
        tips: Array.isArray(src.tips) ? src.tips : []
      };
    }
    merged++;
  }
}

doc.updated = new Date().toISOString().slice(0, 10);
doc._칸설명 = Object.assign({}, doc._칸설명, {
  ko: "한국어 제목·한 줄 설명. 프롬프트는 언제 쓰는지(when)·본문(prompt)·예시(example)·팁(tips)까지",
  en: "영어 제목·한 줄 설명. 프롬프트는 when·prompt·example·tips 까지"
});
fs.writeFileSync(DEMOS, JSON.stringify(doc, null, 2) + "\n");

const stillThin = doc.items.filter((i) => i.cat === "prompt" && !i.ko.example).map((i) => i.n);
console.log("합친 프롬프트: " + merged + "개");
if (missing.length) console.log("아직 없는 파일: " + missing.join(", "));
if (stillThin.length) console.log("예시가 아직 없는 번호: " + stillThin.join(", "));
