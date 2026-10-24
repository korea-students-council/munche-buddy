# 짝꽁 빙고

대한학생회 「짝꽁 사업」 — 팀 단위 디스코드 연동 데일리 미션 빙고 서비스.
기획 내용은 [`../docs/기획서.md`](../docs/기획서.md)를 참고하세요.

| 구성 | 위치 | 설명 |
| --- | --- | --- |
| 참여자 웹 + 어드민 | `src/app` | Next.js 16 (App Router), 디스코드 OAuth 로그인 |
| 디스코드 연동 | `src/app/api/discord`, `src/app/api/cron` | `/인증` 슬래시 명령을 웹 주소로 받아 칸 자동 채우기, 매일 미션 공지(크론). 별도 봇 서버 없음 |
| 핵심 로직 | `src/lib` | 빙고·순위(`bingo.ts`), 규칙 상수(`rules.ts`), 추첨(`raffle.ts`), 인증 판정(`verify.ts`) — 웹과 봇이 공유 |
| DB | `prisma/` | PostgreSQL + Prisma |

## 로컬에서 실행하기

```bash
npm install
cp .env.example .env        # 값을 채워주세요
npx prisma migrate dev      # DB 테이블 생성
npm run db:seed             # (선택) 데모 시즌·팀·미션·인증 데이터 (진행 중 상태로 만들어줘요)
npm run dev                 # http://localhost:3000
npm test                    # 빙고·순위·추첨·시간 계산 단위 테스트
```

- 로컬에서 `/인증`을 직접 받아 보려면 외부에서 접근 가능한 주소(ngrok 등)가 필요해요. 로컬에서는 어드민의 **수동 인증 처리**로 대신 확인할 수 있어요.
- `.env`의 `DEV_LOGIN="true"`이면 디스코드 없이 `http://localhost:3000/api/auth/dev?id=admin&name=운영진&admin=1` 로 테스트 로그인할 수 있어요. **운영(`NODE_ENV=production`)에서는 항상 비활성화**됩니다.
- 로컬 PostgreSQL이 없다면 Docker로 `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16` 후
  `DATABASE_URL="postgresql://postgres:pw@localhost:5432/postgres"` 로 설정하세요.

## 디스코드 설정

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. **General Information**의 **Application ID**(= `DISCORD_CLIENT_ID`)와 **Public Key**(= `DISCORD_PUBLIC_KEY`)를 복사
3. **OAuth2** → Redirects에 `{APP_URL}/api/auth/callback` 추가 → Client Secret 발급
4. **Bot** → 토큰 발급 → `DISCORD_BOT_TOKEN`. 어드민 팀 관리에서 서버 멤버를 자동으로 불러오려면 **Server Members Intent**를 켜야 해요. (Message Content Intent는 필요 없어요)
5. 봇 초대: scope `bot` + `applications.commands`, 권한 *View Channels, Send Messages, Embed Links, Attach Files* — `CLIENT_ID`만 바꿔 여세요.
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=52224`
6. 서비스를 배포한 뒤, **General Information → Interactions Endpoint URL**에 `{APP_URL}/api/discord/interactions` 를 넣고 저장 (저장할 때 디스코드가 서명 검증 요청을 보내 확인해요)
7. 개발자 모드를 켜고 서버·**공지 채널**·**인증 채널** ID를 복사해 어드민 → **시즌 설정**에 입력하고, 같은 화면의 **/인증 명령 등록**을 한 번 눌러요
8. `ADMIN_DISCORD_IDS`에 운영진 디스코드 ID를 넣으면 최초 로그인 시 어드민이 돼요. `DISCORD_GUILD_ID`를 넣으면 그 서버 멤버만 로그인할 수 있어요.

## 배포 (Vercel + Neon, 서버 한 대 없이)

`/인증`은 디스코드가 웹 주소로 직접 보내주는 방식이라 **봇을 24시간 켜 둘 서버가 필요 없어요.** Vercel 하나로 웹·어드민·`/인증`·공지가 모두 동작해요.

1. 저장소를 GitHub에 올리고 [Vercel](https://vercel.com) → **Add New → Project** → 저장소 선택
   (조직의 **비공개** 저장소는 Vercel Pro가 필요해요. 무료(Hobby)로 쓰려면 저장소를 공개로 두세요. 비밀값은 코드에 없어요.)
2. **Root Directory**를 `app`으로 지정 (Build Command는 `package.json`의 `vercel-build`가 자동으로 쓰여요: 마이그레이션 → 빌드)
3. **Storage → Create → Neon (Postgres)** 를 프로젝트에 연결 → `DATABASE_URL`, `DATABASE_URL_UNPOOLED`가 자동으로 등록돼요
4. **Settings → Environment Variables**에 아래를 등록하고 재배포

| 변수 | 값 |
| --- | --- |
| `SESSION_SECRET` | 32자 이상 랜덤 문자열 (`openssl rand -base64 32`) |
| `CRON_SECRET` | 랜덤 문자열 (Vercel 크론이 자동으로 이 값을 헤더에 붙여 호출해요) |
| `APP_URL` | 배포 주소 (예: `https://xxx.vercel.app`, 끝에 `/` 없이) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | 개발자 포털 OAuth2 |
| `DISCORD_PUBLIC_KEY` | 개발자 포털 General Information의 Public Key |
| `DISCORD_BOT_TOKEN` | 개발자 포털 Bot |
| `DISCORD_GUILD_ID` | 참여 서버 ID |
| `ADMIN_DISCORD_IDS` | 운영진 디스코드 ID (쉼표 구분) |
| `DEV_LOGIN` | `false` (반드시) |

> 매일 미션 공지는 `vercel.json`의 크론(매일 07:00 KST)이 호출해요. 무료 플랜에서는 7시대 중 한 시점에 실행돼요. 어드민 → 시즌 설정의 **지금 미션 공지 실행**으로 바로 올릴 수도 있어요.
> 데모 데이터(`npm run db:seed`)는 운영 DB에 넣지 마세요.

## 운영 체크리스트

- [ ] 시즌 설정: 시작·최종 마감, 채널 ID, 시상 입력 → **/인증 명령 등록**
- [ ] 미션 등록: **대면 5개 이상 + 비대면 20개 이상** (번호 자동 부여, 사진 선택 미션은 따로 표시) → 비대면 **일정 자동 배정**
- [ ] **팀 관리**에서 2~4명씩 팀 편성 (디스코드 ID로 일괄 생성 가능)
- [ ] 대시보드의 "확인이 필요해요" 경고가 없는지 확인
- [ ] 시즌 시작 전 팀원들이 로그인해 팀명·색·빙고판을 제출하도록 안내
- [ ] 진행 중 **인증 검수**에서 사진을 보고 부적절한 인증 반려
- [ ] 종료 후 **순위·시상**에서 1·2등 확인 → 추첨 → 최종 확정

## 환경변수

`.env.example` 참고. `SESSION_SECRET`은 32자 이상 랜덤 문자열(`openssl rand -base64 32`)로 설정하세요.
