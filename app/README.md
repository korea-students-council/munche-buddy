# 짝꽁 빙고

대한학생회 「짝꽁 사업」 — 팀 단위 디스코드 연동 데일리 미션 빙고 서비스.
기획 내용은 [`../docs/기획서.md`](../docs/기획서.md)를 참고하세요.

| 구성 | 위치 | 설명 |
| --- | --- | --- |
| 참여자 웹 + 어드민 | `src/app` | Next.js 16 (App Router), 디스코드 OAuth 로그인 |
| 디스코드 봇 | `bot/` | 미션 공지, `/인증` 슬래시 명령 처리 → 칸 자동 채우기 (discord.js) |
| 핵심 로직 | `src/lib` | 빙고·순위(`bingo.ts`), 규칙 상수(`rules.ts`), 추첨(`raffle.ts`), 인증 판정(`verify.ts`) — 웹과 봇이 공유 |
| DB | `prisma/` | PostgreSQL + Prisma |

## 로컬에서 실행하기

```bash
npm install
cp .env.example .env        # 값을 채워주세요
npx prisma migrate dev      # DB 테이블 생성
npm run db:seed             # (선택) 데모 시즌·팀·미션·인증 데이터 (진행 중 상태로 만들어줘요)
npm run dev                 # http://localhost:3000
npm run bot                 # (선택) 디스코드 봇, DISCORD_BOT_TOKEN 필요
npm test                    # 빙고·순위·추첨·시간 계산 단위 테스트
```

- `.env`의 `DEV_LOGIN="true"`이면 디스코드 없이 `http://localhost:3000/api/auth/dev?id=admin&name=운영진&admin=1` 로 테스트 로그인할 수 있어요. **운영(`NODE_ENV=production`)에서는 항상 비활성화**됩니다.
- 로컬 PostgreSQL이 없다면 Docker로 `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16` 후
  `DATABASE_URL="postgresql://postgres:pw@localhost:5432/postgres"` 로 설정하세요.

## 디스코드 설정

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**
2. **OAuth2** → Redirects에 `{APP_URL}/api/auth/callback` 추가 → Client ID/Secret을 `.env`에
3. **Bot** → 토큰 발급 → `DISCORD_BOT_TOKEN`. 슬래시 명령을 쓰므로 Message Content Intent는 필요 없지만, 어드민 팀 관리에서 서버 멤버를 자동으로 불러오려면 **Server Members Intent**를 켜야 해요.
4. 봇 초대: scope `bot` + `applications.commands`, 권한 *View Channels, Send Messages, Embed Links, Attach Files* (인증 사진을 채널에 보관하려면 필요) — 아래 주소에서 `CLIENT_ID`만 바꿔 열면 돼요.
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=52224`
5. 디스코드 개발자 모드를 켜고 서버·**공지 채널**·**인증 채널** ID를 복사해 어드민 → **시즌 설정**에 입력
6. `DISCORD_GUILD_ID`를 넣으면 해당 서버 멤버만 로그인할 수 있어요. `ADMIN_DISCORD_IDS`에 운영진 디스코드 ID를 넣으면 최초 로그인 시 어드민이 돼요.

## 배포 (Railway 한 곳에 웹 + 봇 + DB)

`Dockerfile`이 웹과 봇을 한 컨테이너에서 함께 실행해요. 시작할 때 DB 마이그레이션도 자동으로 해요. (`scripts/start.sh`)

1. [Railway](https://railway.com)에 GitHub로 가입 → **New Project → Deploy from GitHub repo** → 이 저장소 선택
2. 서비스 **Settings → Source → Root Directory**를 `app`으로 설정
3. 같은 프로젝트에서 **+ New → Database → PostgreSQL** 추가
4. 앱 서비스 **Variables**에 아래를 등록 (`DATABASE_URL`은 `${{Postgres.DATABASE_URL}}` 참조로 연결)

| 변수 | 값 |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `SESSION_SECRET` | 32자 이상 랜덤 문자열 (`openssl rand -base64 32`) |
| `APP_URL` | 발급된 도메인 (예: `https://xxx.up.railway.app`, 끝에 `/` 없이) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | 개발자 포털 OAuth2 |
| `DISCORD_BOT_TOKEN` | 개발자 포털 Bot |
| `DISCORD_GUILD_ID` | 참여 서버 ID |
| `ADMIN_DISCORD_IDS` | 운영진 디스코드 ID (쉼표 구분) |
| `DEV_LOGIN` | `false` (반드시) |

5. **Settings → Networking → Generate Domain**으로 주소를 만들고, 그 주소를 `APP_URL`에 넣은 뒤 재배포
6. 개발자 포털 **OAuth2 → Redirects**에 `{APP_URL}/api/auth/callback` 추가
7. 첫 로그인한 `ADMIN_DISCORD_IDS` 계정으로 어드민 → 시즌 설정부터 진행

> 봇은 서버가 켜져 있는 동안만 동작해요. 봇이 죽으면 5초 뒤 자동으로 다시 시작되고, 웹은 계속 동작해요.
> 데모 데이터(`npm run db:seed`)는 운영 DB에 넣지 마세요.

Vercel(웹) + Neon(DB) + 별도 봇 서버로 나눠 배포해도 돼요. 이때 Vercel Build Command는 `prisma migrate deploy && next build`, Root Directory는 `app`이에요.

## 운영 체크리스트

- [ ] 시즌 설정: 시작·최종 마감, 채널 ID, 시상 입력
- [ ] 미션 등록: **대면 5개 이상 + 비대면 20개 이상** (번호 자동 부여, 사진 선택 미션은 따로 표시) → 비대면 **일정 자동 배정**
- [ ] **팀 관리**에서 2~4명씩 팀 편성 (디스코드 ID로 일괄 생성 가능)
- [ ] 대시보드의 "확인이 필요해요" 경고가 없는지 확인
- [ ] 시즌 시작 전 팀원들이 로그인해 팀명·색·빙고판을 제출하도록 안내
- [ ] 진행 중 **인증 검수**에서 사진을 보고 부적절한 인증 반려
- [ ] 종료 후 **순위·시상**에서 1·2등 확인 → 추첨 → 최종 확정

## 환경변수

`.env.example` 참고. `SESSION_SECRET`은 32자 이상 랜덤 문자열(`openssl rand -base64 32`)로 설정하세요.
