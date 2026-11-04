/* 후하씨 huhassi — 한/영 전환 공통 스크립트
   SPDX-License-Identifier: MIT
   쓰는 법:
     <span data-ko="안녕" data-en="Hello"></span>        → 글자 바뀜
     <input data-ko-ph="이름" data-en-ph="Name">          → placeholder
     <button data-ko-aria="닫기" data-en-aria="Close">    → aria-label
     <div data-lang-ko>…</div> <div data-lang-en>…</div>  → 덩어리째 교체
*/
(function () {
  var KEY = "huhassi-lang";
  function pick() {
    try { var s = localStorage.getItem(KEY); if (s === "ko" || s === "en") return s; } catch (e) {}
    return (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  }
  function apply(lang) {
    var d = document.documentElement;
    d.lang = lang;
    var k = lang === "ko";
    document.querySelectorAll("[data-ko],[data-en]").forEach(function (el) {
      var v = el.getAttribute(k ? "data-ko" : "data-en");
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll("[data-ko-ph],[data-en-ph]").forEach(function (el) {
      var v = el.getAttribute(k ? "data-ko-ph" : "data-en-ph");
      if (v !== null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll("[data-ko-aria],[data-en-aria]").forEach(function (el) {
      var v = el.getAttribute(k ? "data-ko-aria" : "data-en-aria");
      if (v !== null) el.setAttribute("aria-label", v);
    });
    document.querySelectorAll("[data-ko-title],[data-en-title]").forEach(function (el) {
      var v = el.getAttribute(k ? "data-ko-title" : "data-en-title");
      if (v !== null) el.setAttribute("title", v);
    });
    document.querySelectorAll(".langbtn").forEach(function (b) {
      b.textContent = k ? "EN" : "한국어";
      b.setAttribute("aria-label", k ? "Switch to English" : "한국어로 보기");
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent("huhassi:lang", { detail: { lang: lang } }));
  }
  window.huhassi = window.huhassi || {};
  window.huhassi.lang = function () { return document.documentElement.lang === "en" ? "en" : "ko"; };
  window.huhassi.applyLang = apply;
  window.huhassi.t = function (ko, en) { return window.huhassi.lang() === "ko" ? ko : en; };

  function boot() {
    apply(pick());
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".langbtn") : null;
      if (b) { e.preventDefault(); apply(document.documentElement.lang === "ko" ? "en" : "ko"); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
