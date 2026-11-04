/* 후하씨 huhassi — 신청 폼 보내기
   SPDX-License-Identifier: MIT */
(function () {
  var form = document.getElementById("reqform");
  if (!form) return;
  var msg = document.getElementById("msg");
  var send = document.getElementById("send");
  var body = document.getElementById("body");
  var count = document.getElementById("count");
  var kind = document.getElementById("kind");

  var KINDS = [
    { v: "", ko: "고르지 않음", en: "Not sure yet" },
    { v: "tool", ko: "작은 도구", en: "A small tool" },
    { v: "game", ko: "간단한 놀이", en: "A simple game" },
    { v: "site", ko: "한 장짜리 페이지", en: "A one-page site" },
    { v: "prompt", ko: "프롬프트", en: "A prompt" },
    { v: "mcp", ko: "MCP 서버", en: "An MCP server" },
    { v: "etc", ko: "그 밖의 것", en: "Something else" }
  ];
  function fillKinds() {
    var lang = window.huhassi.lang(), cur = kind.value;
    kind.innerHTML = "";
    KINDS.forEach(function (k) {
      var o = document.createElement("option");
      o.value = k.v; o.textContent = k[lang];
      kind.appendChild(o);
    });
    kind.value = cur;
  }
  fillKinds();
  document.addEventListener("huhassi:lang", fillKinds);

  body.addEventListener("input", function () { count.textContent = body.value.length; });

  function show(kindClass, ko, en) {
    msg.className = "msg show " + kindClass;
    msg.textContent = window.huhassi.t(ko, en);
  }

  function looksReachable(v) {
    var t = v.trim();
    if (/^https?:\/\/\S+\.\S+/i.test(t)) return true;                 // 링크
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return true;           // 메일 주소
    if (/^@[A-Za-z0-9._]{2,}$/.test(t)) return true;                      // @아이디
    return false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var consent = document.getElementById("consent");
    var data = {
      name: form.name.value.trim(),
      contact: form.contact.value.trim(),
      kind: kind.value,
      body: body.value.trim(),
      lang: window.huhassi.lang(),
      consent: !!(consent && consent.checked),
      website: form.website.value
    };
    if (data.contact.length < 3) {
      show("bad", "답장 받을 곳을 적어 주세요.", "Please tell me where to reply.");
      form.contact.focus();
      return;
    }
    // 메일 주소나 링크처럼 '연락이 닿을 수 있는 모양'인지만 한 번 본다.
    // 오타난 주소로 보내 놓고 답을 영영 못 받는 일을 줄이려는 것.
    if (!looksReachable(data.contact)) {
      show("bad",
        "답장 받을 곳이 메일 주소나 링크처럼 보이지 않습니다. 다시 한번 봐 주세요.",
        "That doesn't look like an email address or a link. Could you check it?");
      form.contact.focus();
      return;
    }
    if (data.body.length < 5) {
      show("bad", "무엇이 필요한지 조금만 더 적어 주세요.", "Please say a little more about what you need.");
      body.focus();
      return;
    }
    if (!data.consent) {
      show("bad",
        "답장을 드리려면 개인정보 수집·이용 동의가 필요합니다. 아래 네모를 체크해 주세요.",
        "I need your agreement to use your details to reply. Please tick the box below.");
      if (consent) consent.focus();
      return;
    }
    send.disabled = true;
    show("ok", "보내는 중입니다…", "Sending…");

    fetch("api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (res.ok) {
        form.reset(); count.textContent = "0"; fillKinds();
        if (consent) consent.checked = false;
        show("ok",
          "잘 받았습니다. 답장 받을 곳으로 연락드리겠습니다. 바로 답하지 못할 수도 있습니다.",
          "Got it. I'll reply where you told me to — though maybe not straight away.");
      } else if (res.j && res.j.error === "too_many") {
        show("bad",
          "조금 전에 여러 번 보내셨습니다. 10분 뒤에 다시 시도해 주세요.",
          "That's a few in a row. Please try again in ten minutes.");
      } else if (res.j && res.j.error === "bad_contact") {
        show("bad",
          "답장 받을 곳이 메일 주소나 링크처럼 보이지 않습니다. 다시 한번 봐 주세요.",
          "That doesn't look like an email address or a link. Could you check it?");
      } else if (res.j && res.j.error === "no_consent") {
        show("bad",
          "동의 네모를 체크해 주세요.",
          "Please tick the agreement box.");
      } else if (res.j && res.j.error === "not_configured") {
        show("bad",
          "지금은 신청을 받지 못하는 상태입니다. 잠시 뒤 다시 시도해 주세요.",
          "The form is not able to take requests right now. Please try again later.");
      } else {
        show("bad",
          "보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
          "That didn't send. Please try again in a moment.");
      }
    }).catch(function () {
      show("bad",
        "보내지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.",
        "That didn't send. Check your connection and try again.");
    }).then(function () { send.disabled = false; });
  });
})();
