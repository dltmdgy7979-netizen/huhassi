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
