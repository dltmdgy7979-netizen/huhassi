/* 후하씨 huhassi — demos.json 한 파일을 읽어 오는 공통 코드
   SPDX-License-Identifier: MIT */
(function () {
  window.huhassi = window.huhassi || {};
  var cache = null;
  window.huhassi.load = function (base) {
    if (cache) return cache;
    cache = fetch((base || "") + "demos.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("demos.json " + r.status);
        return r.json();
      })
      .then(function (d) { return d.items || []; });
    return cache;
  };
  window.huhassi.pad = function (n) { return n < 10 ? "0" + n : String(n); };
  window.huhassi.priceLabel = function (item, lang) {
    if (!item.price) return lang === "ko" ? "무료" : "Free";
    var n = Number(item.price).toLocaleString(lang === "ko" ? "ko-KR" : "en-US");
    return item.currency === "KRW" ? (lang === "ko" ? n + "원" : "₩" + n) : n + " " + item.currency;
  };
})();
