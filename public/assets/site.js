/* 후하씨 huhassi — 첫 화면 갤러리 (demos.json 한 파일로 만든다)
   SPDX-License-Identifier: MIT */
(function () {
  var KIND = {
    game:   { ko: "게임",   en: "Game" },
    tool:   { ko: "도구",   en: "Tool" },
    site:   { ko: "한 장 페이지", en: "One-pager" },
    mcp:    { ko: "MCP",    en: "MCP" },
    prompt: { ko: "프롬프트", en: "Prompt" }
  };
  var ORDER = ["all", "game", "tool", "site", "mcp", "prompt"];

  var grid = document.getElementById("grid");
  var chips = document.getElementById("chips");
  var empty = document.getElementById("empty");
  var q = document.getElementById("q");
  var sortSel = document.getElementById("sort");
  var fail = document.getElementById("loadfail");
  if (!grid) return;

  var SORTS = [
    { v: "num",  ko: "번호순",   en: "By number" },
    { v: "name", ko: "이름순",   en: "By name" },
    { v: "kind", ko: "종류별",   en: "By kind" }
  ];
  var ALL = [], state = { cat: "all", q: "", sort: "num" };
  var pad = window.huhassi.pad;
  function L() { return window.huhassi.lang(); }

  function drawSorts() {
    if (!sortSel) return;
    var lang = L();
    sortSel.innerHTML = "";
    SORTS.forEach(function (o) {
      var op = document.createElement("option");
      op.value = o.v; op.textContent = o[lang];
      sortSel.appendChild(op);
    });
    sortSel.value = state.sort;
  }

  function drawChips() {
    var lang = L();
    chips.innerHTML = "";
    ORDER.forEach(function (c) {
      var count = c === "all" ? ALL.length : ALL.filter(function (i) { return i.cat === c; }).length;
      if (!count) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.cat = c;
      b.setAttribute("aria-pressed", state.cat === c ? "true" : "false");
      b.appendChild(document.createTextNode(c === "all" ? (lang === "ko" ? "전체" : "All") : KIND[c][lang]));
      var s = document.createElement("span"); s.className = "c"; s.textContent = count;
      b.appendChild(s);
      chips.appendChild(b);
    });
  }

  function card(i, lang) {
    var li = document.createElement("li");
    li.className = "card"; li.dataset.cat = i.cat;

    var a = document.createElement("a");
    a.href = i.href;

    if (i.thumb) {
      var img = document.createElement("img");
      img.className = "thumb"; img.src = i.thumb; img.alt = "";
      img.loading = "lazy"; img.decoding = "async";
      img.addEventListener("error", function () { img.remove(); });
      a.appendChild(img);
    }

    var body = document.createElement("div"); body.className = "body";

    var top = document.createElement("div"); top.className = "toprow";
    var n = document.createElement("span"); n.className = "n"; n.textContent = pad(i.n);
    var k = document.createElement("span"); k.className = "kind";
    var dot = document.createElement("i"); dot.setAttribute("aria-hidden", "true");
    k.appendChild(dot);
    k.appendChild(document.createTextNode(KIND[i.cat][lang]));
    top.appendChild(n); top.appendChild(k);

    var h = document.createElement("h3"); h.textContent = i[lang].title;
    var d = document.createElement("p"); d.textContent = i[lang].desc;

    var foot = document.createElement("div"); foot.className = "foot";
    var pr = document.createElement("span"); pr.className = "price";
    pr.textContent = window.huhassi.priceLabel(i, lang);
    var lc = document.createElement("span"); lc.className = "lic"; lc.textContent = i.license;
    foot.appendChild(pr); foot.appendChild(lc);
    if (i.payUrl) {
      var pay = document.createElement("span");
      pay.className = "lic";
      pay.textContent = lang === "ko" ? "결제" : "Buy";
      foot.appendChild(pay);
    }

    body.appendChild(top); body.appendChild(h); body.appendChild(d); body.appendChild(foot);
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  function draw() {
    var lang = L();
    var term = state.q.trim().toLowerCase();
    var list = ALL.filter(function (i) {
      if (state.cat !== "all" && i.cat !== state.cat) return false;
      if (!term) return true;
      var hay = (i.ko.title + " " + i.ko.desc + " " + i.en.title + " " + i.en.desc + " " + pad(i.n)).toLowerCase();
      return hay.indexOf(term) !== -1;
    });
    var order = ORDER.slice(1);
    list.sort(function (a, b) {
      if (state.sort === "name") return a[lang].title.localeCompare(b[lang].title, lang === "ko" ? "ko" : "en");
      if (state.sort === "kind") {
        var d = order.indexOf(a.cat) - order.indexOf(b.cat);
        return d !== 0 ? d : a.n - b.n;
      }
      return a.n - b.n;
    });

    grid.innerHTML = "";
    list.forEach(function (i) { grid.appendChild(card(i, lang)); });
    empty.hidden = list.length > 0;
    if (empty.hidden === false) {
      empty.textContent = state.q
        ? window.huhassi.t("‘" + state.q + "’ 로 찾은 게 없습니다. 다른 낱말로 찾아보세요.",
                           "Nothing matches \u201c" + state.q + "\u201d. Try another word.")
        : window.huhassi.t("이 종류에는 아직 아무것도 없습니다.", "Nothing in this kind yet.");
    }
  }

  chips.addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    state.cat = b.dataset.cat; drawChips(); draw();
  });
  q.addEventListener("input", function () { state.q = q.value; draw(); });
  if (sortSel) sortSel.addEventListener("change", function () { state.sort = sortSel.value; draw(); });
  document.addEventListener("huhassi:lang", function () {
    if (ALL.length) { drawSorts(); drawChips(); draw(); }
  });

  window.huhassi.load("").then(function (items) {
    ALL = items.slice().sort(function (a, b) { return a.n - b.n; });
    drawSorts(); drawChips(); draw();
  }, function () { if (fail) fail.hidden = false; });
})();
