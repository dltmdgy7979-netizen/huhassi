#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
빌더 만들기.

각 틀 파일에서 <style> 안의 CSS 와 마지막 <script> 안의 동작 코드를 꺼내
builder.src.html 의 자리표시자에 끼워 넣고, 손님이 쓰는 index.html 을 만든다.

틀을 늘릴 때:
  1) 틀 파일을 만든다 (template_<이름>.html)
  2) 아래 TEMPLATES 에 한 줄 추가한다
  3) builder.src.html 에 그 이름의 tpl-css / tpl-runtime 블록을 둔다
"""
import re, sys, pathlib

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
SRC = HERE / "builder.src.html"
OUT = ROOT / "public" / "landing" / "make" / "index.html"
SAMPLE = ROOT / "public" / "landing" / "sample"

# 이름 → 틀 파일
TEMPLATES = {
    "restaurant": "template_restaurant.html",
    "shop": "template_shop.html",
    "beauty": "template_beauty.html",
    "academy": "template_academy.html",
    "repair": "template_repair.html",
}


def pull(path: pathlib.Path):
    s = path.read_text(encoding="utf-8")
    css = re.search(r"<style>(.*?)</style>", s, re.S)
    if not css:
        sys.exit(f"[실패] {path.name} 에서 <style> 를 찾지 못했습니다")
    scripts = re.findall(r"<script>(.*?)</script>", s, re.S)
    if not scripts:
        sys.exit(f"[실패] {path.name} 에서 동작 코드(<script>)를 찾지 못했습니다")
    return css.group(1).strip(), scripts[-1].strip()


def check(name: str, text: str):
    # <script type="text/plain"> 안에 들어가므로 </script 가 있으면 파서가 먼저 끊긴다
    if re.search(r"</\s*script", text, re.I):
        sys.exit(f"[실패] {name} 안에 </script 문자열이 있습니다. 코드를 고쳐야 합니다")


def noindex(html: str) -> str:
    # 아직 갤러리에 올리기 전이라 검색에 잡히지 않게 한다
    if 'name="robots"' in html:
        return html
    return html.replace("<title>", '<meta name="robots" content="noindex, nofollow">\n<title>', 1)


def main():
    src = SRC.read_text(encoding="utf-8")
    sizes = []

    for name, fname in TEMPLATES.items():
        path = HERE / fname
        if not path.exists():
            sys.exit(f"[실패] 틀 파일이 없습니다: {fname}")
        css, runtime = pull(path)
        check(f"{name} CSS", css)
        check(f"{name} 동작 코드", runtime)

        for mark, body in ((f"/*CSS_HERE:{name}*/", css), (f"/*RUNTIME_HERE:{name}*/", runtime)):
            if mark not in src:
                sys.exit(f"[실패] builder.src.html 에 {mark} 자리가 없습니다")
            src = src.replace(mark, body)
        sizes.append(f"{name} CSS {len(css)/1024:.0f}KB · 코드 {len(runtime)/1024:.0f}KB")

        # 틀 미리보기도 주소로 열 수 있게 복사
        SAMPLE.mkdir(parents=True, exist_ok=True)
        (SAMPLE / f"{name}.html").write_text(noindex(path.read_text(encoding="utf-8")), encoding="utf-8")

    left = re.findall(r"/\*(?:CSS|RUNTIME)_HERE:[^*]+\*/", src)
    if left:
        sys.exit(f"[실패] 채우지 못한 자리가 남았습니다: {left}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(noindex(src), encoding="utf-8")
    kb = len(src.encode("utf-8")) / 1024
    print(f"[됨] {OUT.relative_to(ROOT)}  ({kb:.0f}KB)  틀 {len(TEMPLATES)}개")
    for line in sizes:
        print("     " + line)


def night_sample():
    """밤 분위기 예시. 음식점 틀에 주점 내용을 넣어 sample/night.html 로 만든다."""
    import json
    sys.path.insert(0, str(HERE))
    import sample_art
    art = sample_art.night_sample()
    t = (HERE / "template_restaurant.html").read_text(encoding="utf-8")
    m = re.search(r'(<script type="application/json" id="site-data">)(.*?)(</script>)', t, re.S)
    d = json.loads(m.group(2))
    d["theme"] = {"primary": "#E8306F", "titleFont": "sans", "mood": "night"}
    d["shop"].update(name="달빛포차", tagline="퇴근길에 한 잔, 부담 없이.\n늦은 밤까지 불 켜 둡니다.",
                     hero=art["hero"], band=art["band"],
                     quote="안주는 넉넉하게,\n술값은 가볍게.", quoteBy="달빛포차 주인 드림")
    day = {"open": "17:00", "close": "02:00", "breakStart": "", "breakEnd": ""}
    d["hours"] = {"week": {k: dict(day) for k in ("mon", "tue", "wed", "thu", "fri", "sat")} | {"sun": None},
                  "lastOrder": "01:00", "holidayNote": "공휴일 전날도 새벽 2시까지 엽니다."}
    d["menu"] = {"title": "대표 안주", "priceNote": "표시 금액은 손님이 실제 내는 금액입니다.", "items": [
        {"name": "옛날 통닭", "price": "17,000원", "signature": True, "note": "주문 후 통째로 튀깁니다", "photo": art["items"][0]},
        {"name": "먹태와 청양마요", "price": "14,000원", "signature": True, "note": "불에 한 번 더 굽습니다", "photo": art["items"][1]},
        {"name": "어묵탕", "price": "13,000원", "signature": False, "note": "", "photo": ""},
        {"name": "계란말이", "price": "9,000원", "signature": False, "note": "", "photo": ""},
        {"name": "생맥주 500", "price": "4,500원", "signature": False, "note": "", "photo": ""}]}
    d["origin"] = [{"item": "닭고기", "value": "국내산"}, {"item": "쌀", "value": "국내산"}]
    d["place"]["info"] = [{"label": "주차", "value": "가게 앞 공영주차장 (저녁 6시 이후 무료)"},
                          {"label": "단체석", "value": "최대 16명 (하루 전 전화)"}]
    d["contact"]["kakaoChannel"] = ""
    d["reviewUrl"] = ""
    d["gallery"] = [{"src": a, "alt": alt} for a, alt in art["gallery"]]
    body = json.dumps(d, ensure_ascii=False, indent=2).replace("<", "\\u003c")
    out = t[:m.start(2)] + "\n" + body + "\n" + t[m.end(2):]
    out = re.sub(r"<title>.*?</title>", "<title>달빛포차 · 밤 분위기 예시</title>", out, count=1, flags=re.S)
    out = out.replace("소담식당 · 광주 동구", "달빛포차 · 밤 분위기 예시")
    out = out.replace("광주 동구 작은 한식당. 매일 아침 끓이는 국과 제철 반찬.", "퇴근길에 한 잔, 부담 없이. 늦은 밤까지 불 켜 둡니다.")
    (SAMPLE / "night.html").write_text(noindex(out), encoding="utf-8")
    print("[됨] public/landing/sample/night.html (밤 분위기 예시)")

if __name__ == "__main__":
    main()
    night_sample()
