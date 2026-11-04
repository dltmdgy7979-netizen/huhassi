# 배포와 키 설정 — 차례대로 하나씩

후하씨 사이트를 올리고, 신청 폼이 저장되게 만드는 절차입니다.
화면은 전부 한국어 설정 기준으로 적었습니다. 한 단계씩, 끝내고 다음으로 넘어가세요.

마지막 수정: 2026-11-04

---

## 0. 미리 알아 둘 것

- 이 사이트는 **Node 서버 하나**로 돌아갑니다. 설치할 라이브러리가 없습니다.
- 비밀 값은 **Railway 의 Variables(변수)** 에만 넣습니다. 코드나 HTML 에는 절대 적지 않습니다.
- 넣어야 할 변수는 딱 두 개입니다.

| 변수 이름 | 무엇 | 없으면 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 주소 | 신청 폼이 "보내지 못했습니다"로 끝남 |
| `SUPABASE_KEY` | Supabase publishable 키 | 위와 같음 |

(선택) `SUPABASE_TABLE` — 표 이름을 바꿨을 때만. 기본값 `huhassi_requests`.

---

## 1. GitHub 저장소 만들기

1. github.com 에 로그인합니다.
2. 오른쪽 위 **+** → **New repository** 를 누릅니다.
3. Repository name 칸에 `huhassi` 를 적습니다.
4. **Public** 을 고릅니다. (코드를 가져갈 수 있게 하는 게 이 사이트의 취지입니다)
5. 아래 체크상자(Add a README 등)는 **전부 비워 둡니다**. 이미 파일이 있어서 부딪힙니다.
6. **Create repository** 를 누릅니다.

## 2. 코드 올리기

내 컴퓨터의 프로젝트 폴더에서 차례대로:

```bash
git init
git add .
git commit -m "후하씨 쇼케이스 1차"
git branch -M main
git remote add origin https://github.com/dltmdgy7979-netizen/huhassi.git
git push -u origin main
```

## 3. Railway 에 올리기

1. railway.app 에 GitHub 계정으로 로그인합니다.
2. **New Project** → **Deploy from GitHub repo** 를 고릅니다.
3. 목록에서 `huhassi` 를 고릅니다. (안 보이면 **Configure GitHub App** 에서 이 저장소에 권한을 줍니다)
4. Railway 가 Node 프로젝트인 걸 알아서 알아보고 `npm start` 로 띄웁니다. 따로 설정할 게 없습니다.
5. 첫 배포가 끝날 때까지 1~2분 기다립니다.

## 4. 주소 만들기

1. 서비스를 누르고 **Settings** 탭으로 갑니다.
2. **Networking** → **Generate Domain** 을 누릅니다.
3. `무엇무엇.up.railway.app` 주소가 생깁니다. 이게 지금의 사이트 주소입니다.
4. 나중에 `huhassi` 도메인을 사면 같은 자리에서 **Custom Domain** 으로 연결하고,
   도메인 산 곳(가비아 등)의 DNS 에 Railway 가 알려 주는 CNAME 값을 넣으면 됩니다.

## 5. Supabase 키 가져오기 — 하나씩

1. supabase.com 에 로그인합니다.
2. 프로젝트 **코리아로컬플랫폼** 을 엽니다. (신청 폼 표는 여기에 이미 만들어 두었습니다)
3. 왼쪽 맨 아래 **Project Settings**(톱니바퀴)를 누릅니다.
4. **API Keys** 를 누릅니다.
5. **Project URL** 을 복사합니다. `https://greyjrioorwlfuazzarb.supabase.co` 모양입니다.
   → 이게 `SUPABASE_URL` 입니다.
6. 같은 쪽에서 **publishable key**(`sb_publishable_` 로 시작)를 복사합니다.
   → 이게 `SUPABASE_KEY` 입니다.
7. ⚠️ **secret key / service_role 키는 절대 쓰지 마세요.** 그 키는 표 전체를 지울 수 있습니다.
   publishable 키는 이 표에 **글을 넣는 것만** 할 수 있게 막아 두었습니다.

## 6. Railway 에 키 넣기 — 하나씩

1. Railway 에서 서비스를 누릅니다.
2. **Variables** 탭을 누릅니다.
3. **New Variable** 을 누릅니다.
4. 이름 칸에 `SUPABASE_URL`, 값 칸에 5번에서 복사한 주소를 붙여 넣고 **Add** 를 누릅니다.
5. 다시 **New Variable** 을 누릅니다.
6. 이름 칸에 `SUPABASE_KEY`, 값 칸에 6번에서 복사한 키를 붙여 넣고 **Add** 를 누릅니다.
7. 값을 넣으면 Railway 가 알아서 다시 배포합니다. 1분쯤 기다립니다.

## 7. 폼이 정말 저장되는지 확인

1. 사이트에서 **만들어 주세요** 를 엽니다.
2. 답장 받을 곳에 `test@test.com`, 내용에 `테스트입니다` 를 적고 보냅니다.
3. "잘 받았습니다" 가 나오면 성공입니다.
4. Supabase → **Table Editor** → `huhassi_requests` 표에 줄이 하나 생겼는지 봅니다.
5. 확인했으면 그 줄은 지워도 됩니다.

안 되면: Railway → **Deployments** → 로그에서 `[huhassi]` 로 시작하는 줄을 찾습니다.
- `SUPABASE_URL / SUPABASE_KEY 가 비어 있습니다` → 6번을 다시 합니다.
- `supabase 401` 또는 `403` → 키를 잘못 복사했습니다. 5번부터 다시 합니다.

## 8. 들어온 신청 읽기

따로 관리자 화면을 만들지 않았습니다. (로그인 기능을 두지 않으려고 그렇게 했습니다)

1. Supabase → **Table Editor** → `huhassi_requests`
2. `created_at` 을 내림차순으로 두고 봅니다.
3. 답장한 것은 `status` 칸을 `done` 으로, 안 할 것은 `no` 로 바꿔 두면 헷갈리지 않습니다.

## 9. 고치고 다시 올리기

```bash
git add .
git commit -m "무엇을 고쳤는지"
git push
```

밀어 넣으면 Railway 가 알아서 다시 배포합니다. 따로 누를 것이 없습니다.

## 10. (14번 데모를 직접 쓸 때만) 공휴일 API 키

이건 사이트 배포와 상관없습니다. 공휴일 MCP 를 **내 컴퓨터에서 쓸 때만** 필요합니다.

1. data.go.kr(공공데이터포털)에 회원가입하고 로그인합니다.
2. 검색창에 `특일 정보` 를 넣고 **한국천문연구원_특일 정보** 를 찾습니다.
3. **활용신청** 을 누릅니다. 활용목적은 "개인 참고용" 정도로 적으면 됩니다.
4. 승인될 때까지 기다립니다. 보통 금방 되지만 바로는 아닙니다.
5. **마이페이지** → **개발계정** 에서 **일반 인증키(Decoding)** 를 복사합니다.
6. 그 값을 Claude 설정 파일의 `HOLIDAY_API_KEY` 자리에 붙여 넣습니다.
   자세한 건 사이트의 14번 데모 쪽에 그대로 적어 두었습니다.
7. 이 키는 **웹페이지에 넣지 마세요.** 내 컴퓨터의 설정 파일에만 둡니다.

---

## 비상시

- **사이트가 안 열린다** → Railway → Deployments → 맨 위 배포의 로그를 봅니다.
  빨간 줄 바로 위가 원인입니다.
- **방금 올린 게 사이트를 망가뜨렸다** → Railway → Deployments 에서 잘 돌던 배포의
  점 세 개 → **Redeploy** 를 누르면 그 상태로 돌아갑니다.
- **폼으로 장난 글이 쏟아진다** → Supabase 에서 `huhassi anon can insert` 정책을 끄면
  바로 막힙니다. 사이트는 그대로 돌아가고 폼만 "보내지 못했습니다"가 됩니다.
