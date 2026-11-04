# 후하씨 (huhassi)

개발을 배운 적 없는 사람이 AI와 함께 만든 작은 것들 — 게임, 도구, 한 장 페이지, MCP 서버, 프롬프트 —
을 한자리에 모아 둔 취미 사이트입니다. 열어서 바로 써 보고, 마음에 들면 코드를 가져가세요.

전부 **MIT** 입니다. 복사하고, 고치고, 팔아도 됩니다.

> Small things built with an AI by someone who never learned to code.
> Open one, use it, take the code. All MIT.

## 돌려 보기

```bash
npm start     # http://localhost:3000
```

설치할 것이 없습니다. Node 18 이상이면 됩니다.

## 폴더

```
public/
  index.html      첫 화면(갤러리)
  prompts.html    프롬프트 모음
  request.html    "만들어 주세요" 신청 폼
  about.html      소개
  license.html    라이선스와 표
  demos.json      ★ 전시 목록 — 이 파일 하나로 갤러리가 만들어집니다
  assets/         공통 CSS·JS
  demos/<이름>/   데모 한 벌 (index.html, preview.svg)
  mcp/<이름>/     MCP 서버 (server.js, README.md 포함)
lib/zip.js        ZIP 묶기
server.js         정적 파일 + 신청 폼 저장 + ZIP 내려주기
docs/runbook.md   배포와 키 설정 절차
CLAUDE.md         이 저장소의 결정사항과 원칙
```

## 목록에 하나 더하려면

`public/demos.json` 의 `items` 에 한 줄 더하고, 같은 `slug` 로 폴더를 만들면 끝입니다.
자세한 규칙은 [CLAUDE.md](CLAUDE.md) 를 보세요.

## 환경변수

| 이름 | 쓰임 | 없을 때 |
|---|---|---|
| `PORT` | 서버 포트 | 3000 |
| `SUPABASE_URL` | 신청 폼 저장 | 폼만 동작 안 함 |
| `SUPABASE_KEY` | 신청 폼 저장 (publishable 키) | 폼만 동작 안 함 |
| `SUPABASE_TABLE` | 표 이름 | `huhassi_requests` |

설정 절차는 [docs/runbook.md](docs/runbook.md) 에 하나씩 적어 두었습니다.

## 라이선스

코드·글·프롬프트 전부 MIT — [LICENSE](LICENSE).
바깥에서 빌려 쓴 것과 각각의 라이선스는 [THIRD_PARTY.md](THIRD_PARTY.md) 에 있습니다.
