#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
빌더 만들기.

template_restaurant.html 에서 <style> 안의 CSS 와 마지막 <script> 안의 동작 코드를
꺼내서 builder.src.html 의 자리표시자에 끼워 넣고 builder.html 을 만든다.

틀을 늘릴 때(설계서 4번)는 TEMPLATES 목록에 틀 파일을 추가하고
builder.src.html 에 틀마다 tpl-css-xxx / tpl-runtime-xxx 블록을 둔다.
"""
import re, sys, pathlib

HERE = pathlib.Path(__file__).parent
SRC = HERE / "builder.src.html"
OUT = HERE / "builder.html"
TEMPLATE = HERE / "template_restaurant.html"


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


def main():
    css, runtime = pull(TEMPLATE)
    check("CSS", css)
    check("동작 코드", runtime)

    src = SRC.read_text(encoding="utf-8")
    for mark, body in (("/*CSS_HERE*/", css), ("/*RUNTIME_HERE*/", runtime)):
        if mark not in src:
            sys.exit(f"[실패] builder.src.html 에 {mark} 자리가 없습니다")
        src = src.replace(mark, body)

    OUT.write_text(src, encoding="utf-8")
    kb = len(src.encode("utf-8")) / 1024
    print(f"[됨] builder.html  ({kb:.0f}KB)")
    print(f"     틀 CSS {len(css)/1024:.0f}KB · 동작 코드 {len(runtime)/1024:.0f}KB")


if __name__ == "__main__":
    main()
