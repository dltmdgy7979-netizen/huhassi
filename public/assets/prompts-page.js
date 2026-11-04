/* 후하씨 huhassi — 프롬프트 목록 (demos.json 의 prompt 항목으로 만든다)
   SPDX-License-Identifier: MIT */
(function () {
  var GROUPS = {
    "글쓰기": "Writing", "블로그": "Blog", "SNS": "Social", "업무": "Work",
    "일상": "Everyday", "아이와": "With kids", "공부": "Learning", "기획": "Planning"
  };
  var list = document.getElementById("plist");
  var bar = document.getElementById("pgroups");
  var fail = document.getElementById("loadfail");
  if (!list) return;

  var DATA = [], state = { g: "all" }, open = {};
  var pad = window.huhassi.pad;
  function L() { return window.huhassi.lang(); }

  function drawBar() {
    var lang = L();
    bar.innerHTML = "";
    var gs = ["all"].concat(Object.keys(GROUPS).filter(function (g) {
      return DATA.some(function (p) { return p.group === g; });
    }));
    gs.forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button"; b.dataset.g = g;
      b.setAttribute("aria-pressed", state.g === g ? "true" : "false");
      b.textContent = g === "all" ? (lang === "ko" ? "전체" : "All") : (lang === "ko" ? g : GROUPS[g]);
      bar.appendChild(b);
    });
  }

  function copyBtn(getText, lang) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn copy";
    b.textContent = lang === "ko" ? "복사" : "Copy";
    b.addEventListener("click", function () {
      var text = getText();
      function done() {
        b.textContent = lang === "ko" ? "복사했어요" : "Copied";
        b.classList.add("copied");
        setTimeout(function () {
          b.textContent = lang === "ko" ? "복사" : "Copy";
          b.classList.remove("copied");
        }, 1600);
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

  function draw() {
    var lang = L();
    list.innerHTML = "";
    DATA.filter(function (p) { return state.g === "all" || p.group === state.g; }).forEach(function (p) {
      var li = document.createElement("li");
      li.className = "pitem"; li.id = "p" + p.n;

      var head = document.createElement("div");
      head.className = "phead";
      var n = document.createElement("span"); n.className = "n"; n.textContent = pad(p.n);
      var h = document.createElement("h2"); h.textContent = p[lang].title;
      var d = document.createElement("p"); d.textContent = p[lang].desc;
      head.appendChild(n); head.appendChild(h);
      head.appendChild(copyBtn(function () { return p[lang].prompt; }, lang));
      head.appendChild(d);

      var body = document.createElement("pre");
      body.className = "ptext";
      body.textContent = p[lang].prompt;
      body.hidden = !open[p.n];

      var tog = document.createElement("button");
      tog.type = "button"; tog.className = "ptoggle";
      function setLabel() {
        tog.textContent = body.hidden
          ? (lang === "ko" ? "프롬프트 펼쳐 보기" : "Show the prompt")
          : (lang === "ko" ? "접기" : "Hide");
        tog.setAttribute("aria-expanded", body.hidden ? "false" : "true");
      }
      setLabel();
      tog.addEventListener("click", function () {
        body.hidden = !body.hidden; open[p.n] = !body.hidden; setLabel();
      });

      li.appendChild(head); li.appendChild(tog); li.appendChild(body);
      list.appendChild(li);
    });
    if (location.hash && /^#p\d+$/.test(location.hash)) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) {
        var b = t.querySelector(".ptext");
        if (b && b.hidden) t.querySelector(".ptoggle").click();
        t.scrollIntoView({ block: "start" });
      }
    }
  }

  bar.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.g = b.dataset.g; drawBar(); draw();
  });
  document.addEventListener("huhassi:lang", function () { if (DATA.length) { drawBar(); draw(); } });

  window.huhassi.load("").then(function (items) {
    DATA = items.filter(function (i) { return i.cat === "prompt"; }).sort(function (a, b) { return a.n - b.n; });
    drawBar(); draw();
  }, function () { if (fail) fail.hidden = false; });
})();
