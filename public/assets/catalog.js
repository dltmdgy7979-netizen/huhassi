/* 후하씨 huhassi — demos.json 한 파일을 읽어 오는 공통 코드
   SPDX-License-Identifier: MIT */
(function () {
  window.huhassi = window.huhassi || {};
  var cache = {};
  /* which: "catalog" = 갤러리용 가벼운 목록(기본), "demos" = 프롬프트 본문까지 든 원본 */
  window.huhassi.load = function (base, which) {
    var file = which === "demos" ? "demos.json" : "catalog.json";
    var key = (base || "") + file;
    if (cache[key]) return cache[key];
    cache[key] = fetch(key, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error(file + " " + r.status);
        return r.json();
      })
      .then(function (d) { return d.items || []; });
    return cache[key];
  };
  window.huhassi.pad = function (n) { return n < 10 ? "0" + n : String(n); };
  window.huhassi.priceLabel = function (item, lang) {
    if (!item.price) return lang === "ko" ? "무료" : "Free";
    var n = Number(item.price).toLocaleString(lang === "ko" ? "ko-KR" : "en-US");
    return item.currency === "KRW" ? (lang === "ko" ? n + "원" : "₩" + n) : n + " " + item.currency;
  };
})();
