# CLAUDE.md — 후하씨(huhassi) 작업 규칙

이 저장소에서 일하는 사람(과 AI)이 먼저 읽는 문서입니다.
결정된 것과 지켜야 할 원칙만 적습니다. 바뀌면 이 파일부터 고칩니다.

마지막 수정: 2026-11-04

---

## 1. 이게 뭔가

개발을 배운 적 없는 사람이 AI와 함께 만든 작은 것들(게임·도구·한 장 페이지·MCP·프롬프트)을
한 자리에 모아 보여 주는 **취미 사이트**입니다. 사업이 아닙니다.

- 보는 사람은 열어서 바로 써 보고, 마음에 들면 코드를 가져갑니다.
- 직접 만들기 어려운 사람은 **신청 폼**으로 부탁하고, 시간과 관심이 되면 무료로 만들어 줍니다.
- 크몽 등 다른 수익화 작업과는 별개입니다.

## 2. 정해진 것 (바꾸려면 주인에게 먼저 묻기)

| 항목 | 결정 |
|---|---|
| 저장소 | `dltmdgy7979-netizen/huhassi` (공개, MIT) |
| 배포 | Railway, 뒤에 `huhassi` 도메인 구입 예정 |
| 구성 | 정적 사이트 + 아주 작은 Node 서버(폼 저장·ZIP 만들기) |
| 언어 | 한국어·영어 병기 |
| 연락 | 사이트의 신청 폼만. **메일 주소를 사이트에 노출하지 않는다** (연락 메일은 huhassi@kakao.com, 공개 금지) |
| 폼 저장 | 기존 Supabase 프로젝트의 `huhassi_requests` 표 |
| 가격 | 지금은 전부 무료. 나중을 위해 데모마다 가격·결제 링크 칸만 비워 둠 |
| 제외 | 운영 중인 본인 사이트(udy.co.kr 등)는 전시하지 않는다 |
| 작업 방식 | AI가 완성본까지 만들고, 주인이 **번호로** 지적해 고친다 |

## 3. 디자인 원칙

- 흰 바탕 + 주황 포인트(`--orange #FF6A13`), 카드형, **모바일 먼저**.
- 색·글꼴·간격은 `public/assets/base.css` 의 변수만 쓴다. 새 색을 들이지 않는다.
- 360px 폭에서 가로 스크롤이 생기면 안 된다.
- 움직임은 아껴서. `prefers-reduced-motion` 을 반드시 존중한다.
- 글은 짧고 담백하게. 과장하지 않고, 못 하는 것은 못 한다고 적는다.

## 4. 전시 목록은 `public/demos.json` 한 파일로 관리한다

갤러리(첫 화면)와 프롬프트 쪽은 **전부 이 파일 하나**로 그려집니다.
항목을 더하거나 빼거나 값을 고치려면 이 파일만 고치면 됩니다.

| 칸 | 뜻 |
|---|---|
| `n` | 번호 1~40. 주인이 이 번호로 지적합니다. 번호를 함부로 바꾸지 말 것 |
| `slug` | 폴더 이름 |
| `cat` | `game` / `tool` / `site` / `mcp` / `prompt` |
| `href` | 열리는 주소 |
| `thumb` | 카드에 보일 미리보기 그림 (`preview.svg`) |
| `license` | 기본 `MIT` |
| `price` | 숫자. `0` 이면 "무료"로 보입니다 |
| `currency` | `KRW` |
| `payUrl` | 결제 링크. 비어 있으면 결제 표시가 안 나옵니다 |
| `uses` | 쓰인 바깥 재료 (라이선스 표의 근거) |
| `ko` / `en` | 제목·한 줄 설명. 프롬프트는 본문(`prompt`)까지 |

## 5. 라이선스 원칙

- 내가 만든 것은 전부 **MIT**.
- **상업적 사용이 허용되지 않는 재료는 쓰지 않는다.** 예외 없음.
- 바깥 재료를 쓰면 ① 그 데모 쪽의 출처·라이선스 표 ② `public/license.html`
  ③ `THIRD_PARTY.md` 세 곳에 모두 적는다.
- 남의 그림·글꼴·소리·브랜드 이름·캐릭터를 쓰지 않는다. 그림은 직접 그린 SVG 만.
- 상표 조심: 흔한 놀이를 만들더라도 **상표로 등록된 이름을 제목·코드·주석에 쓰지 않는다**
  (예: 떨어지는 블록 놀이는 "블록 쌓기"로 부른다).

## 6. 데모 한 쪽에 반드시 들어가는 것

1. 작동 미리보기 — 열면 바로 돌아가야 한다
2. 한·영 한 줄 설명
3. 사용법 **정확히 다섯 줄**
4. 출처·라이선스 표
5. 코드 가져가기 — GitHub 폴더 링크 + ZIP 내려받기
6. "만들어 주세요" 신청 폼으로 가는 안내

## 7. 코드 원칙

- 바깥 라이브러리를 기본으로 쓰지 않는다. 꼭 필요하면 MIT/BSD/Apache/OFL 만, 한 개씩,
  그리고 못 불러왔을 때 화면이 깨지지 않게 대비한다.
- 빌드 과정 없음. 파일을 열면 돌아간다.
- 서버는 `server.js` 하나. node 기본 모듈만 쓴다.
- 브라우저에서 처리할 수 있는 일(사진·글)은 **서버로 보내지 않는다**. 사이트에 그렇게 적혀 있다.
- 비밀 값(Supabase 키 등)은 환경변수로만. 코드나 HTML 에 절대 적지 않는다.

## 8. 폴더

```
public/
  index.html        첫 화면(갤러리)
  prompts.html      프롬프트 25개
  request.html      만들어 주세요 신청 폼
  about.html        소개
  license.html      라이선스와 표
  404.html
  demos.json        ★ 전시 목록 한 파일
  assets/           base.css home.css demo.css prompts.css
                    i18n.js catalog.js site.js prompts-page.js request.js
  demos/<slug>/     index.html, preview.svg (한 장 페이지는 template.html 도)
  mcp/<slug>/       index.html, preview.svg, server.js, package.json, README.md
lib/zip.js          ZIP 묶기 (바깥 라이브러리 없음)
server.js           정적 파일 + /api/request + /api/zip
docs/runbook.md     배포와 키 설정 절차
```

## 8-2. 자동으로 만들어지는 파일 (직접 고치지 말 것)

| 파일 | 무엇 | 다시 만드는 법 |
|---|---|---|
| `public/catalog.json` | 첫 화면 갤러리용 가벼운 목록 | `npm run catalog` |
| `public/sitemap.xml`, `public/robots.txt` | 검색용 | `npm run seo` |
| 각 쪽의 canonical·공유 미리보기(OG) 태그 | 검색·공유용 | `npm run seo` |

`demos.json` 을 고쳤으면 **`npm run build` 를 한 번 돌리고 커밋**하세요.
세 개를 한꺼번에 다시 만듭니다. 도메인이 바뀌면 `SITE_BASE=https://새주소 npm run seo`.

## 9. 일하는 순서

1. `public/demos.json` 에 항목을 먼저 적는다 (번호·제목·설명·라이선스).
2. 폴더를 만들고 `index.html` 과 `preview.svg` 를 만든다.
3. `npm run build` 를 돌린다 (갤러리 목록·sitemap·공유 태그 갱신).
4. `npm start` 로 띄워 휴대폰 폭(360px)에서 눈으로 확인한다.
5. 커밋 → Railway 가 알아서 배포한다.
6. 주인에게 **번호로** 확인받고, 지적받은 번호만 고친다.
