/* 후하씨 huhassi — 프롬프트 목록 (demos.json 의 prompt 항목으로 만든다)
   한 항목 = 언제 쓰는지 / 프롬프트 본문 / 예시 입력·출력 / 팁
   SPDX-License-Identifier: MIT */
(function () {
  var GROUPS = {
    "글쓰기": "Writing", "블로그": "Blog", "SNS": "Social", "업무": "Work",
    "일상": "Everyday", "아이와": "With kids", "공부": "Learning", "기획": "Planning"
  };
  var list = document.getElementById("plist");
  var bar = document.getElementById("pgroups");
  var fail = document.getElementById("loadfail");
  var countEl = document.getElementById("pcount");
  if (!list) return;

  var DATA = [], state = { g: "all" }, open = {};
  var pad = window.huhassi.pad;
  function L() { return window.huhassi.lang(); }
  function t(ko, en) { return window.huhassi.t(ko, en); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function copyButton(getText, label) {
    var b = el("button", "btn btn-sm", label());
    b.type = "button";
    b.addEventListener("click", function () {
      var text = getText();
      function done() {
        var keep = label();
        b.textContent = t("복사했어요", "Copied");
        b.classList.add("copied");
        setTimeout(function () { b.textContent = keep; b.classList.remove("copied"); }, 1600);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "-1000px";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
    });
    return b;
  }

  function drawBar() {
    var lang = L();
    bar.innerHTML = "";
    var gs = ["all"].concat(Object.keys(GROUPS).filter(function (g) {
      return DATA.some(function (p) { return p.group === g; });
    }));
    gs.forEach(function (g) {
      var b = el("button", null, g === "all" ? t("전체", "All") : (lang === "ko" ? g : GROUPS[g]));
      b.type = "button"; b.dataset.g = g;
      b.setAttribute("aria-pressed", state.g === g ? "true" : "false");
      var n = DATA.filter(function (p) { return g === "all" || p.group === g; }).length;
      var c = el("span", "c", n);
      b.appendChild(c);
      bar.appendChild(b);
    });
  }

  function section(titleText) {
    var h = el("h3", "psub", titleText);
    return h;
  }

  function item(p, lang) {
    var d = p[lang] || p.ko;
    var li = el("li", "pitem");
    li.id = "p" + p.n;

    var head = el("div", "phead");
    head.appendChild(el("span", "n", pad(p.n)));
    head.appendChild(el("h2", null, d.title));
    head.appendChild(el("p", null, d.desc));
    li.appendChild(head);

    if (d.when) {
      var when = el("p", "pwhen", d.when);
      li.appendChild(when);
    }

    var actions = el("div", "pactions");
    var toggle = el("button", "btn btn-sm", "");
    toggle.type = "button";
    actions.appendChild(toggle);
    actions.appendChild(copyButton(function () { return d.prompt; },
      function () { return t("프롬프트 복사", "Copy prompt"); }));
    li.appendChild(actions);

    var detail = el("div", "pdetail");
    detail.hidden = !open[p.n];

    detail.appendChild(section(t("프롬프트", "The prompt")));
    detail.appendChild(el("pre", "ptext", d.prompt));

    if (d.example && d.example.input) {
      detail.appendChild(section(t("이렇게 넣으면", "Example input")));
      detail.appendChild(el("pre", "ptext pin", d.example.input));
      if (d.example.output) {
        detail.appendChild(section(t("이렇게 나옵니다", "What came back")));
        var out = el("pre", "ptext pout", d.example.output);
        detail.appendChild(out);
        var note = el("p", "pnote", t(
          "실제로 돌려 본 결과를 줄여서 옮긴 것입니다. 쓰실 때는 내용이 달라집니다.",
          "A real run, trimmed. Yours will come out different."));
        detail.appendChild(note);
      }
    }

    if (d.tips && d.tips.length) {
      detail.appendChild(section(t("잘 쓰는 법", "Getting the most from it")));
      var ul = el("ul", "ptips");
      d.tips.forEach(function (x) { ul.appendChild(el("li", null, x)); });
      detail.appendChild(ul);
    }

    function setLabel() {
      toggle.textContent = detail.hidden
        ? t("펼쳐 보기", "Show it")
        : t("접기", "Hide");
      toggle.setAttribute("aria-expanded", detail.hidden ? "false" : "true");
    }
    setLabel();
    toggle.addEventListener("click", function () {
      detail.hidden = !detail.hidden;
      open[p.n] = !detail.hidden;
      setLabel();
    });

    li.appendChild(detail);
    return li;
  }

  function draw() {
    var lang = L();
    list.innerHTML = "";
    var shown = DATA.filter(function (p) { return state.g === "all" || p.group === state.g; });
    shown.forEach(function (p) { list.appendChild(item(p, lang)); });
    if (countEl) {
      countEl.textContent = t(shown.length + "개", shown.length + " prompts");
    }
    if (location.hash && /^#p\d+$/.test(location.hash)) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) {
        var tog = target.querySelector(".pactions .btn");
        var det = target.querySelector(".pdetail");
        if (det && det.hidden && tog) tog.click();
        target.scrollIntoView({ block: "start" });
      }
    }
  }

  bar.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    state.g = b.dataset.g; drawBar(); draw();
  });
  document.addEventListener("huhassi:lang", function () { if (DATA.length) { drawBar(); draw(); } });

  window.huhassi.load("").then(function (items) {
    DATA = items.filter(function (i) { return i.cat === "prompt"; }).sort(function (a, b) { return a.n - b.n; });
    drawBar(); draw();
  }, function () { if (fail) fail.hidden = false; });
})();
