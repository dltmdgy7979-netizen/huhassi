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
OUT = ROOT / "public" / "demos" / "landing-builder" / "index.html"
SAMPLE = OUT.parent / "sample"

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


if __name__ == "__main__":
    main()
