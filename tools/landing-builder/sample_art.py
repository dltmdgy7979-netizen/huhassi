#!/usr/bin/env python3
"""예시(sample) 쪽에 넣는 그림. 전부 여기서 직접 그린 SVG 다 (바깥 그림·사진 없음).
   python3 sample_art.py  →  template_*.html 의 site-data 에 그림을 채운다.
   빌더가 내려 주는 파일에는 들어가지 않는다 (빌더는 SAMPLE() 을 쓴다)."""
import base64, json, math, pathlib, random, re

ROOT = pathlib.Path(__file__).parent

# ---------- 기본 도형 ----------
def R(x, y, w, h, f, rx=0, op=1, extra=""):
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx}" fill="{f}" opacity="{op}" {extra}/>'
def C(cx, cy, r, f, op=1):
    return f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{f}" opacity="{op}"/>'
def E(cx, cy, rx, ry, f, op=1, rot=0):
    t = f' transform="rotate({rot} {cx:.2f} {cy:.2f})"' if rot else ""
    return f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{f}" opacity="{op}"{t}/>'
def P(d, f="none", s="none", sw=0, op=1, cap="round"):
    return f'<path d="{d}" fill="{f}" stroke="{s}" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="round" opacity="{op}"/>'
def G(body, t): return f'<g transform="{t}">{body}</g>'
def grad(i, c1, c2, vert=True):
    x2, y2 = ("0", "1") if vert else ("1", "0")
    return f'<linearGradient id="{i}" x1="0" y1="0" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'
def svg(body, defs=""):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">'
            f'<defs>{defs}</defs>{body}</svg>')
def uri(s): return "data:image/svg+xml;base64," + base64.b64encode(s.encode()).decode()

def shadow(cx, cy, rx, ry, op=.14): return E(cx + .8, cy + 1.4, rx, ry, "#000", op)

# ---------- 음식 ----------
def wood(c1="#C99A6B", c2="#B98452"):
    b = R(0, 0, 100, 100, "url(#wd)")
    for y in (18, 39, 61, 82): b += R(0, y, 100, .5, "#000", 0, .09)
    for x, y, w in ((12, 9, 22), (58, 29, 26), (20, 50, 30), (64, 71, 20), (8, 91, 26)):
        b += R(x, y, w, .35, "#fff", 0, .13)
    return b, grad("wd", c1, c2, False)
def plate(cx, cy, r, rim="#F3EDE4", inner="#FBF8F3"):
    return shadow(cx, cy, r, r) + C(cx, cy, r, rim) + C(cx, cy, r * .76, inner)
def bowl(cx, cy, r, body, content):
    return (shadow(cx, cy, r, r) + C(cx, cy, r, body) + C(cx, cy, r * .82, content)
            + P(f"M{cx - r*.55:.2f} {cy - r*.45:.2f} A{r*.7:.2f} {r*.7:.2f} 0 0 1 {cx + r*.1:.2f} {cy - r*.68:.2f}", s="#fff", sw=.9, op=.28))
def dots(cx, cy, r, cols, n, seed, size=(.7, 1.5)):
    rnd = random.Random(seed); o = ""
    for _ in range(n):
        a = rnd.uniform(0, 6.283); d = r * math.sqrt(rnd.random())
        o += C(cx + d * math.cos(a), cy + d * math.sin(a), rnd.uniform(*size), rnd.choice(cols))
    return o
def chopsticks(x, y, l=34, rot=-8):
    return G(R(0, 0, l, .9, "#5B3A22", .4) + R(0, 2, l, .9, "#5B3A22", .4), f"translate({x} {y}) rotate({rot})")
def spoon(x, y, rot=-80):
    return G(E(0, 0, 3.4, 2.4, "#D9D4CC") + R(3, -.55, 20, 1.1, "#D9D4CC", .5), f"translate({x} {y}) rotate({rot})")
def steam(x, y, op=.5):
    return "".join(P(f"M{x + i*4} {y} q-2 -4 0 -8 q2 -4 0 -8", s="#fff", sw=.9, op=op) for i in range(3))
def rice(cx, cy, r): return bowl(cx, cy, r, "#2E2A27", "#FAF8F2") + dots(cx, cy, r * .6, ["#EFEAE0"], 9, 7, (.5, .9))
def banchan(cx, cy, r, cols, seed): return plate(cx, cy, r) + dots(cx, cy, r * .5, cols, 9, seed, (1, 1.9))

def r_hero():
    w, d = wood()
    b = w + R(8, 10, 84, 80, "#F1E7D8", 3, .5)
    b += bowl(36, 54, 19, "#3A2F2A", "#B5652F") + dots(36, 54, 13, ["#7FA650", "#E8D9B0", "#8A3F1E", "#F2EFE6"], 16, 3)
    b += rice(70, 62, 11.5)
    b += banchan(22, 24, 8.5, ["#B5352A", "#D9603F"], 1) + banchan(44, 20, 8, ["#5E8C3A", "#86B05A"], 2)
    b += banchan(66, 24, 8.5, ["#E3B23C", "#F0CF75"], 4) + banchan(84, 38, 7.5, ["#6B4A2F", "#3E2A1B"], 5)
    b += chopsticks(56, 86, 34, -4) + spoon(88, 90, -172) + steam(30, 34, .35)
    return svg(b, d)
def r_baekban():
    w, d = wood("#D1A679", "#C18F5D")
    b = w + shadow(50, 52, 42, 34) + R(9, 19, 82, 64, "#3B2F28", 5) + R(11.5, 21.5, 77, 59, "#4A3B32", 4)
    b += rice(30, 62, 12) + bowl(60, 62, 13.5, "#2E2A27", "#A9682F") + dots(60, 62, 9, ["#7FA650", "#F2EFE6"], 9, 9)
    b += banchan(24, 34, 7, ["#B5352A"], 11) + banchan(42, 33, 7, ["#5E8C3A"], 12) + banchan(60, 33, 7, ["#E3B23C"], 13) + banchan(78, 36, 7, ["#6B4A2F"], 14)
    b += banchan(80, 60, 6.5, ["#D9603F", "#F2EFE6"], 15)
    return svg(b, d)
def r_sujebi():
    w, d = wood()
    b = w + bowl(50, 52, 32, "#F1EBE1", "#D9C9A5") + dots(50, 52, 22, ["#F6EFDD", "#EFE4C6"], 14, 21, (2.4, 4))
    b += dots(50, 52, 22, ["#6E9A46", "#E28A3A", "#4E7A30"], 12, 22, (.9, 1.6)) + dots(50, 50, 8, ["#3A3A3A"], 14, 23, (.3, .6))
    b += spoon(88, 78, -110) + steam(42, 26, .4)
    return svg(b, d)
def r_bibim():
    w, d = wood("#BF8E5E", "#AD7A4B")
    b = w + bowl(50, 52, 33, "#2B2725", "#F4EFE4")
    cols = ["#5E8C3A", "#E28A3A", "#8A5A33", "#F0CF75", "#B5352A", "#3E6B2C"]
    for i, c in enumerate(cols):
        a0, a1 = i * 60 - 90, i * 60 - 30
        x0, y0 = 50 + 25 * math.cos(math.radians(a0)), 52 + 25 * math.sin(math.radians(a0))
        x1, y1 = 50 + 25 * math.cos(math.radians(a1)), 52 + 25 * math.sin(math.radians(a1))
        b += P(f"M50 52 L{x0:.2f} {y0:.2f} A25 25 0 0 1 {x1:.2f} {y1:.2f} Z", c, op=.95)
    b += C(50, 52, 9.5, "#FBF7EC") + C(50, 52, 4.6, "#F2B632") + dots(50, 52, 20, ["#F6F1E2"], 16, 31, (.25, .5))
    return svg(b, d)
def r_side():
    w, d = wood()
    b = w
    for (x, y, r, c, s) in ((27, 30, 17, ["#B5352A", "#D9603F"], 41), (70, 28, 15, ["#5E8C3A", "#86B05A"], 42),
                            (30, 72, 15, ["#E3B23C", "#F0CF75"], 43), (71, 70, 18, ["#6B4A2F", "#8A5A33"], 44)):
        b += plate(x, y, r) + dots(x, y, r * .5, c, 14, s, (1.4, 2.6))
    return svg(b, d)

# ---------- 가게 앞 · 가게 안 (공통) ----------
def storefront(wall, awn, door, accent, glass="#E9F0EE", awn2="#fff"):
    d = grad("sky", "#F4EEE6", "#EADFD2") + grad("gl", glass, "#CFDAD6")
    b = R(0, 0, 100, 100, "url(#sky)") + R(0, 82, 100, 18, "#CFC6BB") + R(0, 82, 100, 1, "#000", 0, .08)
    b += R(10, 14, 80, 68, wall, 1.5) + R(10, 14, 80, 9, "#000", 1.5, .06)
    b += R(28, 17.5, 44, 7, "#FBF7F0", 1.2) + R(34, 20.2, 32, 1.6, accent, .8, .85)
    b += R(16, 40, 40, 34, "url(#gl)", 1) + R(16, 40, 40, 34, "none", 1, 1, f'stroke="{door}" stroke-width="1.4"')
    b += P("M22 72 L40 42 L46 42 L28 72 Z", "#fff", op=.28) + R(35.4, 40, 1.2, 34, door)
    b += R(64, 40, 20, 42, door, 1) + R(66.5, 43, 15, 22, "url(#gl)", .8) + C(81.4, 62, 1, "#E9C46A")
    for i in range(8):
        b += P(f"M{12 + i*9.75:.2f} 30 h9.75 l-1.2 8.5 h-9.75 Z", awn if i % 2 == 0 else awn2)
    b += R(11, 29, 78, 1.6, "#000", 0, .12)
    for x in (8, 59):
        b += shadow(x + 3, 82, 4.5, 1.2) + P(f"M{x} 74 h6 l-1 8 h-4 Z", "#B66A45") + C(x + 3, 70, 4.8, "#5E8C3A") + C(x + .8, 72, 3.2, "#4E7A30") + C(x + 5.4, 72, 3.4, "#6E9A46")
    return svg(b, d)
def interior(wall, floor, accent, top="#7A5A3F"):
    d = grad("wl", wall, "#fff") + grad("gw", "#FFE9B0", "#FFE9B000")
    b = R(0, 0, 100, 66, "url(#wl)") + R(0, 66, 100, 34, floor) + R(0, 66, 100, .8, "#000", 0, .1)
    for x, y in ((14, 20), (40, 16), (66, 20)):
        b += R(x, y, 16, 20, "#fff", .6) + R(x + 1.5, y + 1.5, 13, 17, accent, .4, .22)
    for x in (22, 50, 78):
        b += R(x - .2, 0, .4, 30, "#3A2F2A") + C(x, 40, 13, "url(#gw)", .5) + P(f"M{x-6} 34 a6 6 0 0 1 12 0 Z", accent) + C(x, 34.6, 1.5, "#FFF3C4")
    for x in (10, 44, 78):
        b += shadow(x + 9, 92, 12, 2, .12) + R(x, 72, 18, 2.4, top, .6) + R(x + 8.2, 74.4, 1.6, 16, "#4A3B32")
        for cx in (x - 6, x + 18):
            b += R(cx, 76, 6, 1.8, accent, .6) + R(cx + (0 if cx < x else 4.6), 66, 1.4, 11, accent, .5) + R(cx + .6, 77.8, 1, 12, "#4A3B32") + R(cx + 4.4, 77.8, 1, 12, "#4A3B32")
    return svg(b, d)

# ---------- 꽃 ----------
def flower(cx, cy, r, col, mid="#F2C94C", n=7):
    o = "".join(C(cx + r * .62 * math.cos(i * 6.283 / n), cy + r * .62 * math.sin(i * 6.283 / n), r * .46, col) for i in range(n))
    return o + C(cx, cy, r * .34, mid)
def leaf(cx, cy, l, rot, col="#5E8C3A"): return E(cx, cy, l, l * .36, col, 1, rot)
def bunch(cx, cy, s, cols, seed, muted=False):
    rnd = random.Random(seed); o = ""
    for i in range(7):
        o += leaf(cx + rnd.uniform(-18, 18) * s, cy + rnd.uniform(-14, 8) * s, 8 * s, rnd.uniform(0, 180), "#8C8A5C" if muted else rnd.choice(["#5E8C3A", "#4E7A30", "#7FA650"]))
    pts = [(-13, -4), (0, -12), (13, -4), (-7, 6), (7, 6), (0, -1), (-16, 8), (16, 8)]
    for i, (dx, dy) in enumerate(pts):
        o += flower(cx + dx * s, cy + dy * s, rnd.uniform(5.4, 7.4) * s, cols[i % len(cols)], "#C9A25B" if muted else "#F2C94C")
    return o
def wrap(cx, cy, s, paper="#D9B98C", ribbon="#B5352A"):
    return (shadow(cx, cy + 34 * s, 16 * s, 3 * s) + P(f"M{cx - 22*s:.2f} {cy:.2f} L{cx + 22*s:.2f} {cy:.2f} L{cx + 5*s:.2f} {cy + 36*s:.2f} L{cx - 5*s:.2f} {cy + 36*s:.2f} Z", paper)
            + P(f"M{cx - 22*s:.2f} {cy:.2f} L{cx:.2f} {cy + 14*s:.2f} L{cx - 5*s:.2f} {cy + 36*s:.2f} Z", "#000", op=.07)
            + R(cx - 7.5 * s, cy + 21 * s, 15 * s, 3 * s, ribbon, .6))
PINK = ["#E8A0B0", "#F4C9B8", "#F6E3C5", "#D97A8C"]
def s_hero():
    d = grad("bg", "#EAF1EA", "#D6E3D6")
    b = R(0, 0, 100, 100, "url(#bg)") + C(82, 16, 24, "#fff", .35) + R(0, 86, 100, 14, "#C9B79E") + R(0, 86, 100, .8, "#000", 0, .08)
    b += wrap(50, 46, 1.25) + bunch(50, 36, 1.3, PINK, 5)
    b += shadow(16, 86, 7, 1.6) + R(11, 68, 10, 18, "#F7F3EC", 2) + bunch(16, 62, .45, ["#F2C94C", "#F6E3C5"], 8)
    b += shadow(84, 86, 8, 1.6) + P("M77 72 h14 l-2 14 h-10 Z", "#B66A45") + C(84, 64, 9, "#5E8C3A") + C(79, 68, 5.5, "#4E7A30") + C(89, 67, 6, "#7FA650")
    return svg(b, d)
def s_item(kind):
    d = grad("bg", "#F4F0E8", "#E8E1D4")
    b = R(0, 0, 100, 100, "url(#bg)") + R(0, 84, 100, 16, "#D8CBB6")
    if kind == "bouquet": b += wrap(50, 44, 1.1) + bunch(50, 35, 1.15, PINK, 61)
    elif kind == "small":
        b += shadow(50, 84, 14, 2.4) + P("M38 52 h24 l-3 32 h-18 Z", "#DCE9EE", op=.92) + P("M40 62 h20 l-2 22 h-16 Z", "#BCD7E0", op=.8) + bunch(50, 42, .8, ["#F2C94C", "#F6E3C5", "#E8A0B0"], 62)
    elif kind == "pot":
        b += shadow(50, 85, 20, 3) + P("M32 58 h36 l-5 27 h-26 Z", "#F7F3EC") + R(30, 54, 40, 6, "#EDE6DA", 2)
        for a in range(-70, 71, 20):
            b += P(f"M50 54 Q{50 + a*.25:.1f} 34 {50 + a*.42:.1f} {22 + abs(a)*.12:.1f}", s="#4E7A30", sw=1.3) + leaf(50 + a * .42, 22 + abs(a) * .12, 8, a + 90, "#5E8C3A" if a % 40 else "#7FA650")
        b += R(41, 66, 18, 8, "#B5352A", 1.5) + R(44, 69, 12, 1.4, "#fff", .7, .8)
    else:
        b += P("M50 50 L44 90 M50 50 L50 92 M50 50 L56 90", s="#8C7A55", sw=1.2) + R(44, 62, 12, 3, "#8A6B45", 1)
        b += bunch(50, 36, 1.05, ["#C9A48E", "#D9C3A0", "#B58A8A", "#E3D2B4"], 64, True)
    return svg(b, d)
def s_shelf():
    d = grad("bg", "#EFEADF", "#E2DACB")
    b = R(0, 0, 100, 100, "url(#bg)")
    rnd = random.Random(71)
    for y in (32, 62, 92):
        b += R(4, y, 92, 2.4, "#8A6B45", .5) + R(4, y + 2.4, 92, 1.2, "#000", 0, .08)
        for x in range(12, 92, 19):
            h = rnd.uniform(9, 13); c = rnd.choice(["#F7F3EC", "#B66A45", "#DCE9EE", "#3A2F2A"])
            b += P(f"M{x-6} {y-h} h12 l-1.5 {h} h-9 Z", c) + C(x, y - h - 6, rnd.uniform(6, 8), rnd.choice(["#5E8C3A", "#4E7A30", "#7FA650"])) + C(x - 4, y - h - 3, 4, "#4E7A30") + C(x + 4.4, y - h - 3.4, 4.4, "#6E9A46")
            if rnd.random() < .5: b += flower(x + 2, y - h - 9, 3.2, rnd.choice(PINK))
    return svg(b, d)

# ---------- 미용 ----------
def b_hero():
    d = grad("bg", "#F5ECEB", "#EADADB") + grad("mr", "#F7FAFA", "#D9E3E3")
    b = R(0, 0, 100, 70, "url(#bg)") + R(0, 70, 100, 30, "#D9C7BD") + R(0, 70, 100, .8, "#000", 0, .08)
    b += P("M30 62 V30 a20 20 0 0 1 40 0 V62 Z", "#C9A25B") + P("M32.5 62 V30 a17.5 17.5 0 0 1 35 0 V62 Z", "url(#mr)") + P("M38 58 L58 20 L63 22 L43 60 Z", "#fff", op=.4)
    b += R(22, 62, 56, 3, "#7A5A3F", 1) + R(24, 65, 52, 1.2, "#000", 0, .08)
    for x, h, c in ((27, 9, "#9B6F75"), (32, 6.5, "#F7F3EC"), (68, 8, "#3A2F2A"), (73, 5.5, "#C9A25B")):
        b += R(x, 62 - h, 3.6, h, c, 1) + R(x + 1, 62 - h - 1.6, 1.6, 1.8, "#3A2F2A", .3)
    b += shadow(50, 95, 14, 2.4) + R(49, 80, 2, 14, "#8D8D8D") + R(40, 93, 20, 2, "#6E6E6E", 1) + R(36, 72, 28, 9, "#3A2F2A", 3) + R(39, 54, 22, 20, "#4A3B36", 4)
    b += shadow(88, 96, 7, 1.6) + P("M83 82 h10 l-1.5 14 h-7 Z", "#F7F3EC") + "".join(leaf(88 + dx, 72 + dy, 8, r, c) for dx, dy, r, c in ((-4, 2, 60, "#5E8C3A"), (4, 0, 120, "#4E7A30"), (0, -6, 90, "#7FA650")))
    return svg(b, d)
def b_tools():
    d = grad("bg", "#F2E8E6", "#E6D6D4")
    b = R(0, 0, 100, 100, "url(#bg)") + R(8, 10, 46, 80, "#FBF7F4", 3, .7)
    sc = (C(0, 0, 5, "none") + f'<circle cx="0" cy="0" r="4.4" fill="none" stroke="#3A2F2A" stroke-width="1.6"/><circle cx="11" cy="0" r="4.4" fill="none" stroke="#3A2F2A" stroke-width="1.6"/>'
          + P("M2 -4 L8 -38 L10 -38 L6 -4 Z", "#BFC5C8") + P("M9 -4 L3 -38 L1 -38 L5 -4 Z", "#D5DADC") + C(5.5, -9, .9, "#3A2F2A"))
    b += G(sc, "translate(26 78) rotate(12)")
    b += G(R(0, 0, 40, 4, "#3A2F2A", 1) + "".join(R(1.5 + i * 1.9, 4, .9, 7, "#3A2F2A") for i in range(20)), "translate(60 22) rotate(18)")
    b += G(R(0, 0, 5, 26, "#9B6F75", 2) + E(2.5, -8, 6.5, 10, "#4A3B36") + "".join(R(-2.6 + i * 1.5, -15, .5, 13, "#C9A25B") for i in range(8)), "translate(74 62) rotate(-24)")
    for x, y, r in ((62, 82, 30), (70, 88, -12)):
        b += G(R(0, 0, 14, 2.6, "#C9A25B", 1.2) + R(0, 1, 9, .6, "#000", 0, .15), f"translate({x} {y}) rotate({r})")
    b += shadow(86, 22, 7, 7, .1) + C(86, 22, 7, "#FBF7F4") + C(86, 22, 4.6, "#EADADB") + C(86, 22, 2, "#FBF7F4")
    return svg(b, d)
def b_bottles():
    d = grad("bg", "#F5ECEB", "#E8DAD8")
    b = R(0, 0, 100, 100, "url(#bg)")
    rnd = random.Random(88)
    for y in (46, 90):
        b += R(4, y, 92, 2.6, "#C9A25B", .5) + R(4, y + 2.6, 92, 1.4, "#000", 0, .07)
        x = 9
        while x < 86:
            w = rnd.uniform(7, 11); h = rnd.uniform(18, 30); c = rnd.choice(["#9B6F75", "#F7F3EC", "#3A2F2A", "#D9B8B0", "#C9A25B", "#E9DCD2"])
            b += R(x, y - h, w, h, c, 2) + R(x + w * .28, y - h - 3, w * .44, 3.4, "#3A2F2A", .6) + R(x + 1.2, y - h * .62, w - 2.4, h * .26, "#fff", .6, .55)
            x += w + rnd.uniform(2.5, 5)
    return svg(b, d)

# ---------- 학원 ----------
def book(x, y, w, h, c): return R(x, y, w, h, c, .6) + R(x, y + h * .2, w, .6, "#fff", 0, .35)
def a_hero():
    d = grad("bg", "#E9EEF3", "#D8E0E9") + grad("win", "#F6FAFD", "#DCE8F1") + grad("gw", "#FFE9B0", "#FFE9B000")
    b = R(0, 0, 100, 68, "url(#bg)") + R(54, 10, 36, 40, "#fff", 1) + R(56, 12, 32, 36, "url(#win)") + R(71.4, 12, 1.2, 36, "#fff") + R(56, 29.4, 32, 1.2, "#fff")
    b += R(0, 68, 100, 32, "#B98A5E") + R(0, 68, 100, 1.2, "#000", 0, .1)
    y = 68
    for w, h, c, dx in ((30, 5, "#36506E", 0), (26, 4.4, "#C9A25B", 2), (28, 5, "#8FA5BC", 1), (22, 4, "#B5352A", 3)):
        y -= h; b += shadow(24 + dx, y + h, w / 2, .6, .1) + book(9 + dx, y, w, h, c)
    b += shadow(60, 86, 22, 2.4, .12) + P("M40 74 L60 71 L80 74 L80 90 L60 87 L40 90 Z", "#FBFAF6") + R(59.6, 71, .8, 16, "#000", 0, .12)
    for i in range(5):
        b += R(43, 77 + i * 2.3, 14, .5, "#36506E", 0, .35) + R(63, 77 + i * 2.3, 14, .5, "#36506E", 0, .35)
    b += G(R(0, 0, 24, 1.6, "#E3B23C", .4) + P("M24 0 l3 .8 l-3 .8 Z", "#3A2F2A"), "translate(52 94) rotate(-14)")
    b += C(26, 34, 20, "url(#gw)", .55) + R(25.4, 40, 1.2, 12, "#3A2F2A") + P("M18 40 a8 8 0 0 1 16 0 Z", "#36506E") + R(20, 51.4, 12, 1.6, "#3A2F2A", .8)
    return svg(b, d)
def a_shelf():
    b = R(0, 0, 100, 100, "#E6DACA")
    rnd = random.Random(93); cols = ["#36506E", "#8FA5BC", "#C9A25B", "#B5352A", "#F4EFE6", "#5E8C3A", "#3A2F2A", "#D9603F"]
    for y in (4, 37, 70):
        b += R(4, y, 92, 29, "#CDB899", 0) + R(4, y + 27, 92, 3, "#8A6B45") + R(4, y, 92, 2, "#000", 0, .08)
        x = 6
        while x < 90:
            w = rnd.uniform(3, 6.4); h = rnd.uniform(17, 25)
            if rnd.random() < .12:
                for k in range(3): b += R(x, y + 27 - (k + 1) * 4, 15, 3.6, rnd.choice(cols), .5)
                x += 17; continue
            b += R(x, y + 27 - h, w, h, rnd.choice(cols), .5) + R(x + w * .25, y + 27 - h + 3, w * .5, .7, "#fff", 0, .45)
            x += w + .5
    return svg(b)
def a_room():
    d = grad("bg", "#EEF2F6", "#DEE5EC")
    b = R(0, 0, 100, 62, "url(#bg)") + R(0, 62, 100, 38, "#C7B299") + R(0, 62, 100, .8, "#000", 0, .08)
    b += R(14, 12, 72, 34, "#8A6B45", 1) + R(16, 14, 68, 30, "#FBFCFC", .6)
    for i, w in enumerate((40, 52, 30, 46)): b += R(21, 20 + i * 5, w, 1, "#36506E", .5, .5)
    b += R(60, 34, 18, 6, "#B5352A", 1, .16) + C(92, 14, 4.4, "#fff") + R(91.8, 11, .4, 3.2, "#3A2F2A") + R(92, 13.8, 2.4, .4, "#3A2F2A")
    for row, (y, s) in enumerate(((70, .8), (82, 1.05))):
        for x in ((14, 40, 66) if row == 0 else (4, 36, 68)):
            b += shadow(x + 13 * s, y + 15 * s, 13 * s, 1.6 * s, .1) + R(x, y, 26 * s, 2.6 * s, "#D9B98C", .6) + R(x + 2 * s, y + 2.6 * s, 1.4 * s, 12 * s, "#6E6E6E") + R(x + 22.6 * s, y + 2.6 * s, 1.4 * s, 12 * s, "#6E6E6E") + R(x + 8 * s, y - 1.6 * s, 9 * s, 1.6 * s, "#FBFAF6", .3)
    return svg(b, d)

# ---------- 방문 수리 ----------
def aircon(x, y, s=1):
    return (shadow(x + 26 * s, y + 17 * s, 26 * s, 2 * s, .12) + R(x, y, 52 * s, 15 * s, "#FBFCFC", 3 * s) + R(x, y + 11 * s, 52 * s, 4 * s, "#E3EAEE", 2 * s)
            + R(x + 4 * s, y + 12.4 * s, 44 * s, 1 * s, "#9FB3BF", .5) + C(x + 46 * s, y + 5 * s, 1 * s, "#3FB984"))
def p_hero():
    d = grad("bg", "#E8F1F4", "#D5E5EB")
    b = R(0, 0, 100, 74, "url(#bg)") + R(0, 74, 100, 26, "#C9BBA8") + R(0, 74, 100, .8, "#000", 0, .08)
    b += aircon(24, 14)
    for i in range(4): b += P(f"M{32 + i*11} 34 q-3 6 0 12 q3 6 0 12", s="#fff", sw=1.2, op=.75)
    b += R(70, 34, 1.6, 58, "#8D8D8D") + R(86, 34, 1.6, 58, "#8D8D8D") + "".join(R(70, 40 + i * 9, 17.6, 1.4, "#A9A9A9") for i in range(6))
    b += shadow(26, 93, 16, 2.2) + R(11, 78, 30, 14, "#1F6E8C", 2) + R(11, 78, 30, 4, "#18586F", 2) + R(22, 73.5, 8, 5, "none", 2, 1, 'stroke="#3A2F2A" stroke-width="1.4"') + R(24, 83, 4, 3, "#E9C46A", .6)
    b += G(R(0, 0, 18, 2, "#B9C0C4", 1) + C(19, 1, 3, "#B9C0C4") + C(20.4, 1, 1.5, "#C9BBA8"), "translate(46 90) rotate(-10)")
    return svg(b, d)
def p_tools():
    d = grad("bg", "#EEF3F5", "#DDE7EB")
    b = R(0, 0, 100, 100, "url(#bg)") + R(6, 8, 88, 84, "#F9FBFB", 3, .6)
    b += G(R(0, 0, 46, 4.4, "#B9C0C4", 2) + C(48, 2.2, 6, "#B9C0C4") + P("M46 -1 h8 v6.4 h-8 Z", "#EEF3F5") + C(0, 2.2, 4.4, "#B9C0C4") + C(0, 2.2, 1.8, "#EEF3F5"), "translate(16 30) rotate(24)")
    b += G(R(0, 0, 18, 6, "#1F6E8C", 3) + R(18, 2.1, 30, 1.8, "#B9C0C4") + P("M48 1.4 l3 1.6 l-3 1.6 Z", "#8D8D8D"), "translate(40 70) rotate(-28)")
    b += G(R(0, 0, 18, 6, "#E9C46A", 3) + R(18, 2.1, 24, 1.8, "#B9C0C4"), "translate(14 76) rotate(-8)")
    b += shadow(76, 30, 11, 11, .1) + C(76, 30, 11, "#3A2F2A") + C(76, 30, 8.6, "#FBFCFC") + P("M76 30 L81 25", s="#B5352A", sw=1.2) + C(76, 30, 1.2, "#3A2F2A") + "".join(R(75.7, 22.4, .6, 2, "#3A2F2A", 0, 1, f'transform="rotate({a} 76 30)"') for a in range(-120, 121, 30))
    b += shadow(78, 74, 9, 9, .1) + C(78, 74, 9, "#E9C46A") + C(78, 74, 5.6, "#F9FBFB") + C(78, 74, 4.6, "#DDE7EB")
    return svg(b, d)
def p_van():
    d = grad("bg", "#E8F1F4", "#D5E5EB") + grad("gl", "#F1F8FA", "#C9DDE5")
    b = R(0, 0, 100, 72, "url(#bg)") + C(18, 20, 9, "#fff", .5) + R(0, 72, 100, 28, "#B9B2A6") + R(0, 72, 100, 1, "#000", 0, .08) + "".join(R(6 + i * 24, 86, 12, 1.2, "#fff", 0, .5) for i in range(4))
    b += shadow(50, 80, 40, 2.4, .16) + P("M10 46 h54 l16 10 h8 a3 3 0 0 1 3 3 v15 h-81 Z", "#FBFCFC") + R(10, 62, 81, 4, "#1F6E8C")
    b += P("M62 49 l12 8 h-12 Z", "url(#gl)") + R(44, 49, 15, 8, "url(#gl)", 1) + R(17, 50, 20, 6, "#1F6E8C", 1, .14)
    b += R(14, 41, 46, 1.6, "#8D8D8D") + R(14, 44, 46, 1.6, "#8D8D8D") + "".join(R(18 + i * 9, 41, 1.2, 4.6, "#8D8D8D") for i in range(5))
    for x in (28, 74): b += C(x, 76, 7, "#2B2725") + C(x, 76, 3.4, "#B9C0C4")
    return svg(b, d)
def p_outdoor():
    d = grad("bg", "#E4E9EB", "#D3DBDE")
    b = R(0, 0, 100, 78, "url(#bg)") + "".join(R(0, y, 100, .5, "#000", 0, .06) for y in range(10, 78, 12)) + R(0, 78, 100, 22, "#BDB5A8")
    b += shadow(50, 82, 34, 3) + R(18, 30, 64, 50, "#F4F6F6", 3) + R(18, 30, 64, 6, "#E3EAEE", 3)
    b += C(44, 58, 18, "#D9E1E4") + C(44, 58, 15.5, "#3A4A52") + "".join(P(f"M44 58 L{44 + 15*math.cos(a):.2f} {58 + 15*math.sin(a):.2f}", s="#D9E1E4", sw=.9) for a in [i * .524 for i in range(12)]) + C(44, 58, 3.4, "#D9E1E4")
    b += "".join(R(68, 42 + i * 4, 9, 1.4, "#B9C7CD", .5) for i in range(8))
    b += P("M82 44 h8 v-44", s="#C98F5A", sw=2) + P("M82 50 h12 v-50", s="#8D8D8D", sw=1.6)
    return svg(b, d)

# ---------- 틀마다 무엇을 넣나 ----------
PLAN = {
  "restaurant": dict(hero=r_hero(), band=r_side(), items=[r_baekban(), r_sujebi(), r_bibim()],
      gallery=[(storefront("#EFE2D0", "#C0452C", "#5B3A22", "#C0452C"), "가게 앞 (예시 그림)"),
               (interior("#F3E7D8", "#C9A77F", "#C0452C"), "가게 안 (예시 그림)"),
               (r_side(), "반찬 (예시 그림)")]),
  "shop": dict(hero=s_hero(), band=s_shelf(), items=[s_item("bouquet"), s_item("small"), s_item("pot"), s_item("dry")],
      gallery=[(storefront("#E4ECE2", "#2F6B4F", "#2F4A3A", "#2F6B4F"), "가게 앞 (예시 그림)"),
               (s_shelf(), "화분 선반 (예시 그림)"),
               (interior("#EEF2EA", "#CDBFA6", "#2F6B4F"), "가게 안 (예시 그림)")]),
  "beauty": dict(hero=b_hero(), items=[],
      gallery=[(b_tools(), "도구 (예시 그림)"), (b_bottles(), "제품 선반 (예시 그림)"),
               (storefront("#F1E4E2", "#9B6F75", "#4A3B36", "#9B6F75"), "가게 앞 (예시 그림)")]),
  "academy": dict(hero=a_hero(), items=[],
      gallery=[(a_room(), "교실 (예시 그림)"), (a_shelf(), "책장 (예시 그림)"),
               (storefront("#E6EBF1", "#36506E", "#2B3D55", "#36506E"), "입구 (예시 그림)")]),
  "repair": dict(hero=p_hero(), items=[],
      gallery=[(p_van(), "작업 차량 (예시 그림)"), (p_tools(), "공구 (예시 그림)"), (p_outdoor(), "실외기 (예시 그림)")]),
}

# ---------- 밤 분위기 예시 (주점) ----------
def _glow(i, c): return f'<radialGradient id="{i}"><stop offset="0" stop-color="{c}" stop-opacity=".55"/><stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>'
def n_front(neon="#E8306F"):
    d = grad("nsky", "#0E0C16", "#1B1420") + grad("nwin", "#FFD98A", "#F2A65A") + _glow("ng", neon) + _glow("wg", "#FFC978")
    b = R(0, 0, 100, 100, "url(#nsky)")
    for x, y, r in ((12, 8, .35), (30, 5, .25), (55, 9, .3), (78, 6, .35), (90, 12, .25), (44, 3, .2)): b += C(x, y, r, "#fff", .6)
    b += R(0, 82, 100, 18, "#15121A") + R(0, 82, 100, .6, "#fff", 0, .06)
    b += R(8, 16, 84, 66, "#221B24", 1.5) + R(8, 16, 84, 66, "none", 1.5, 1, 'stroke="#2E2530" stroke-width=".6"')
    b += E(50, 26, 44, 13, "url(#ng)") + R(22, 20, 56, 11, "#17121A", 1.6)
    b += R(22, 20, 56, 11, "none", 1.6, 1, f'stroke="{neon}" stroke-width=".9"')
    b += P("M30 27.5 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0", s=neon, sw=1.5) + C(27, 23.4, .9, neon) + C(73, 23.4, .9, neon)
    for x in (14, 40):
        b += E(x + 10.5, 60, 17, 22, "url(#wg)", .55) + R(x, 42, 21, 34, "url(#nwin)", 1)
        b += R(x + 10, 42, 1, 34, "#221B24") + R(x, 58, 21, 1, "#221B24")
        b += E(x + 5.5, 70, 3, 5, "#3A2A22", .55) + E(x + 15.5, 69, 3.2, 6, "#3A2A22", .5)
    b += R(68, 40, 18, 42, "#2E2530", 1) + R(70.5, 43, 13, 24, "url(#nwin)", .8, .85) + C(83.6, 63, .9, "#FFD98A")
    b += E(50, 86, 40, 4.5, "url(#wg)", .5) + E(50, 90, 30, 3, "url(#ng)", .45)
    return svg(b, d)
def _mug(x, y, s=1):
    b = E(x + 9 * s, y + 31 * s, 11 * s, 2.2 * s, "#000", .3)
    b += P(f"M{x + 17*s} {y + 9*s} h4.5 a3 3 0 0 1 3 3 v9 a3 3 0 0 1 -3 3 h-4.5", s="#E9E2D6", sw=2.2 * s, op=.85)
    b += R(x, y + 3 * s, 18 * s, 27 * s, "#E8A53A", 2 * s) + R(x + 1.6 * s, y + 6 * s, 3 * s, 21 * s, "#fff", 1.2 * s, .3)
    for i in range(3): b += C(x + (6 + i * 3.6) * s, y + (20 - i * 4.5) * s, .7 * s, "#fff", .5)
    b += R(x - 1 * s, y, 20 * s, 6.5 * s, "#FBF6EA", 3 * s) + C(x + 4 * s, y + .5 * s, 3.2 * s, "#FBF6EA") + C(x + 11 * s, y - .6 * s, 3.8 * s, "#FBF6EA") + C(x + 16.5 * s, y + .8 * s, 2.8 * s, "#FBF6EA")
    return b
def n_table(neon="#E8306F"):
    w, d = wood("#33241E", "#241915")
    d += _glow("tg", "#FFC978") + _glow("tn", neon)
    b = w + E(30, 34, 46, 34, "url(#tg)", .5) + E(88, 80, 36, 28, "url(#tn)", .35)
    b += _mug(18, 32, 1.15) + _mug(46, 38, 1.05)
    b += plate(79, 36, 13, "#3A3138", "#2C252B") + dots(79, 36, 8, ["#D98E3A", "#C4762A", "#E8B15A"], 12, 11, (1.6, 2.8))
    b += bowl(76, 72, 7, "#2E2A27", "#B5352A") + chopsticks(34, 88, 30, -6)
    return svg(b, d)
def n_anju(cols, seed, sauce="#B5352A"):
    w, d = wood("#33241E", "#241915")
    d += _glow("ag", "#FFC978")
    b = w + E(50, 46, 52, 44, "url(#ag)", .45)
    b += plate(46, 50, 30, "#EDE6DA", "#F7F2E9") + dots(46, 50, 19, cols, 22, seed, (2.4, 4.2))
    b += dots(46, 50, 16, ["#5E8C3A"], 6, seed + 5, (.8, 1.3))
    b += bowl(83, 26, 9, "#2E2A27", sauce) + chopsticks(60, 90, 32, -5)
    return svg(b, d)
def night_sample():
    """build.py 가 밤 분위기 예시(sample/night.html)를 만들 때 쓰는 그림 묶음."""
    top = lambda a: a.replace("xMidYMid slice", "xMidYMin slice")   # 넓은 화면에서도 간판이 잘리지 않게 위쪽 기준
    return dict(hero=uri(top(n_front())), band=uri(n_table()),
                items=[uri(n_anju(["#D98E3A", "#C4762A", "#E8B15A"], 21)), uri(n_anju(["#E9D9A8", "#F2E6C0", "#D9C48A"], 22, "#E3B23C"))],
                gallery=[(uri(n_front()), "가게 앞 (예시 그림)"), (uri(n_table()), "한 상 (예시 그림)"),
                         (uri(n_anju(["#B5352A", "#D9603F", "#8A3F1E"], 23, "#F2EFE6")), "안주 (예시 그림)")])

def apply():
    pat = re.compile(r'(<script type="application/json" id="site-data">)(.*?)(</script>)', re.S)
    for name, plan in PLAN.items():
        p = ROOT / f"template_{name}.html"; s = p.read_text(encoding="utf-8")
        m = pat.search(s); d = json.loads(m.group(2))
        d["shop"]["hero"] = uri(plan["hero"])
        if plan.get("band"): d["shop"]["band"] = uri(plan["band"])
        for it, art in zip(d.get("menu", {}).get("items", []), plan["items"]): it["photo"] = uri(art)
        d["gallery"] = [{"src": uri(a), "alt": alt} for a, alt in plan["gallery"]]
        body = json.dumps(d, ensure_ascii=False, indent=2).replace("<", "\\u003c")
        s = s[:m.start(2)] + "\n" + body + "\n" + s[m.end(2):]
        p.write_text(s, encoding="utf-8")
        n = 1 + len(plan["items"]) + len(plan["gallery"])
        kb = (len(uri(plan["hero"])) + sum(len(uri(a)) for a in plan["items"]) + sum(len(uri(a)) for a, _ in plan["gallery"])) / 1024
        print(f"{name:11} 그림 {n}장  {kb:.0f}KB")

def sheet(path="/tmp/art_sheet.html"):
    cells = ""
    for name, plan in PLAN.items():
        arts = [plan["hero"]] + plan["items"] + [a for a, _ in plan["gallery"]]
        cells += f'<h3>{name}</h3><div class="r">' + "".join(f'<div class="c">{a}</div>' for a in arts) + "</div>"
    pathlib.Path(path).write_text('<meta charset="utf-8"><style>body{margin:12px;font:13px sans-serif;background:#222;color:#eee}h3{margin:10px 0 4px}.r{display:flex;gap:8px;flex-wrap:wrap}.c{width:170px;height:170px;border-radius:10px;overflow:hidden}.c svg{width:100%;height:100%;display:block}</style>' + cells, encoding="utf-8")

if __name__ == "__main__":
    import sys
    sheet()
    if "--sheet" not in sys.argv: apply()
