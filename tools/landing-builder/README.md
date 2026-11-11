# 랜딩페이지 빌더 — 만드는 쪽 파일

`public/demos/landing-builder/index.html` 의 재료입니다. **직접 고치지 마세요.**
이 폴더에서 고치고 아래를 돌리면 그 파일이 다시 만들어집니다.

```
python3 tools/landing-builder/build.py
```

| 파일 | 무엇 |
|---|---|
| `template_restaurant.html` | 음식점 틀 (손님이 받는 페이지의 원본) |
| `builder.src.html` | 빌더 화면 (자리표시자 두 곳이 비어 있음) |
| `build.py` | 틀의 CSS·동작코드를 빌더 안에 끼워 넣음 |

틀을 늘릴 때는 틀 파일을 추가하고 `build.py` 와 `builder.src.html` 에 자리를 하나씩 더 만듭니다.

## 주의 — 만든 뒤에 `npm run build` 가 한 번 더 손댑니다

Railway 는 배포할 때 `npm run build` 를 돌립니다. 그 안의 `tools/build-seo.js` 가
각 쪽의 `<head>` 에 공유용 태그를 넣습니다. 그래서 순서는 항상 이렇습니다.

```
python3 tools/landing-builder/build.py   # 빌더 다시 만들기
npm run build                            # 공유 태그·목록·sitemap 갱신
```

`build-seo.js` 는 2026-11-11 에 **머리말 안에서만** 손대도록 고쳤습니다.
예전에는 파일 전체에 정규식을 돌려서, 쪽 안의 자바스크립트가 문자열로 들고 있던
`<meta property="og:...` 줄까지 지워 버렸습니다. 빌더가 휴대폰에서 통째로 멈춘 원인이었습니다.
