/* demos.json(원본 한 파일)에서 갤러리용 가벼운 목록 catalog.json 을 만듭니다.
   첫 화면이 프롬프트 본문까지 받지 않게 하려는 것입니다.
   고치는 파일은 언제나 demos.json 하나. 이 명령은 그 뒤에 한 번 돌립니다.
   쓰는 법: node tools/build-catalog.js
   SPDX-License-Identifier: MIT */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "public");
const src = JSON.parse(fs.readFileSync(path.join(ROOT, "demos.json"), "utf8"));

const light = {
  "_읽는법": "자동 생성 파일입니다. 고치지 마세요 — demos.json 을 고치고 `node tools/build-catalog.js` 를 돌리면 다시 만들어집니다.",
  version: src.version || 1,
  updated: src.updated,
  items: src.items.map((i) => ({
    n: i.n, slug: i.slug, cat: i.cat, href: i.href, thumb: i.thumb || null,
    license: i.license, price: i.price, currency: i.currency, payUrl: i.payUrl,
    group: i.group || null,
    ko: { title: i.ko.title, desc: i.ko.desc },
    en: { title: i.en.title, desc: i.en.desc }
  }))
};

fs.writeFileSync(path.join(ROOT, "catalog.json"), JSON.stringify(light) + "\n");
const kb = (f) => Math.round(fs.statSync(path.join(ROOT, f)).size / 1024);
console.log(`catalog.json 만듦: ${light.items.length}개, ${kb("catalog.json")}KB (demos.json ${kb("demos.json")}KB)`);
