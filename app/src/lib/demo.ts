// 데모 시즌: 진행 중인 시즌 + 팀 6개 + 미션 + 인증 기록.
// 로컬 시드(prisma/seed.ts)와 어드민의 "데모 시즌 넣기"가 함께 쓴다.
// 인증은 봇과 같은 processSubmission을 통과시켜 실제 규칙대로 쌓는다.
import type { Mission, User } from "@prisma/client";
import { db } from "./db";
import { FACE_POSITIONS, CELL_COUNT } from "./rules";
import { processSubmission } from "./verify";
import { kstDay } from "./time";

export const DEMO_EVENT_NAME = "짝꽁 사업 데모";
/** 데모 사용자는 디스코드 ID 대신 이 접두어를 쓴다 (실제 디스코드 ID는 숫자뿐) */
const DEMO_PREFIX = "dev-";

// 실제 짝꽁 사업 미션 후보에서 겹치는 것을 합친 목록. [제목, 설명, 사진 필요 여부]
// 대면 미션은 시즌 동안 대면 칸 수(5개)만큼만 공개된다
type Seed = [title: string, description?: string, requirePhoto?: boolean];
const FACE_MISSIONS: Seed[] = [
  ["밥 같이 먹기"],
  ["카페 가서 서로 골라 준 음료로 인증샷", "상대방이 골라 주는 음료와 함께 찍어요"],
  ["노래방 듀엣곡 95점 이상", "점수 화면이 보이게 찍어 주세요"],
  ["머리띠·안경 씌워 주고 인생네컷", "서로에게 어울리는 머리띠와 안경을 골라 주세요"],
  ["보드게임 카페에서 젠가 17개 이상 빼기"],
];
// 그 밖의 대면 미션 후보 (시즌마다 5개만 골라 공개한다)
// 볼링 평균 90점, 릴스 좋아요 10개, 공포영화, 플로깅, 도서관, 빵집, 제비뽑기 메뉴, 눈사람, 인생샷 찍어 주기
// 앞의 두 개는 기본 미션이라 시즌 첫날부터 공지된다
const REMOTE_MISSIONS: Seed[] = [
  ["카톡 이름 바꾸기", "기본 미션 · 바꾼 화면을 캡처해 주세요"],
  ["전화 한 통 하기", "기본 미션 · 통화 기록을 캡처해 주세요"],
  ["온라인 게임 같이하기"],
  ["애장품 소개하기"],
  ["하루 일과 공유하며 대화하기"],
  ["인생곡 공유하기"],
  ["부담되지 않는 작은 선물 주고받기"],
  ["서로 옷 코디해 주기"],
  ["재밌게 본 영화 감상 공유하기"],
  ["서로의 장점 또는 단점 3가지 이야기하기", "짝선배와 짝후배가 서로에게 말해 줘요"],
  ["말할 수 있는 선에서 고민 상담하기", "", false],
  ["만화 추천해 주기"],
  ["밸런스 게임하기", "주제는 문체 위원장이 알려 드려요"],
  ["간식 선물하고 후기 공유하기"],
  ["서로의 취미 이야기하기"],
  ["이름으로 삼행시 지어 주기"],
  ["릴스 공유하기"],
  ["책 추천하고 후기 공유하기"],
  ["넌센스 퀴즈 맞히기", "", false],
  ["서로의 MBTI 맞혀 보기"],
  ["어울리는 노래 추천하고 이유 말하기"],
  ["삼시세끼 공유하기"],
  ["인생 버킷리스트 3가지 공유하기"],
  ["서로 동네 맛집 추천하고 방문 사진 남기기"],
  ["하루 동안 야자타임", "후임과 선임이 하루 동안 야자타임하며 지내요", false],
  ["가 봤던 여행지 사진 공유하기"],
  ["어릴 때 사진 공유하기"],
  ["졸업 사진 공유하기"],
  ["학생회장 때 좋았던 점·어려웠던 점 공유하기"],
  ["고등학교 때 추억 공유하기"],
  ["어울리는 직업 추천하고 내 꿈 소개하기"],
  ["가장 행복했던 에피소드 공유하기"],
  ["올해 가장 열심히 한 일 공유하기"],
  ["첫사랑 이야기와 이상형 이야기하기"],
  ["서로에게 진심을 담아 편지 쓰기"],
  ["내 사진 3장 중 가장 잘 나온 사진 골라 주기"],
  ["조별 드레스코드 맞춰 하루 지내기", "조마다 드레스코드를 정해 코디하고 다녀요"],
  ["상대 동네 가 보고 싶은 곳 대신 다녀오기", "다녀온 뒤 후기를 알려 주세요"],
  ["서로 닮은 동물과 이유 말해 주기"],
  ["21기가 소개하는 20대의 로망", "22기가 궁금한 20대의 로망을 21기가 소개해요"],
  ["좋아하는 애니메이션 추천하기"],
  ["셋이 함께 문체 위원장 MBTI 추리하기"],
  ["나눈 대화 중 가장 인상 깊었던 이야기 공유하기"],
];
const TEAM_NAMES = ["반짝반짝 짝꽁", "솜사탕 팀", "초록이들", "달콤한 짝꽁", "구름 위의 짝꿍들", "토끼굴 탐험대"];
const USER_NAMES = ["민준", "서연", "지호", "하은", "도윤", "수아", "예준", "지우", "시우", "서윤", "하준", "채원", "주원", "다은"];

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;
/** KST 날짜 + 시각 → 인스턴트 */
const kst = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+09:00`);
const shuffle = <T,>(a: T[]) => a.sort(() => Math.random() - 0.5);

/** 인증 사진 대신 쓰는 간단한 SVG 이미지 */
const photo = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="#d9f1de"/><circle cx="160" cy="90" r="46" fill="#ffd95a" stroke="#2b2b2b" stroke-width="4"/><text x="160" y="190" font-size="26" text-anchor="middle" fill="#2b2b2b">${label}</text></svg>`,
  )}`;

/** 데모 시즌과 데모 사용자만 지운다. 실제 시즌은 건드리지 않는다 */
export async function removeDemoData() {
  await db.event.deleteMany({ where: { name: DEMO_EVENT_NAME } });
  await db.user.deleteMany({ where: { discordId: { startsWith: DEMO_PREFIX } } });
}

/**
 * 데모 시즌을 새로 만들어 활성화한다. members 는 1조에 함께 넣을 실제 사용자
 * (직접 로그인해서 /인증을 해 보거나 우리 팀 화면을 볼 수 있게).
 */
export async function createDemoSeason(opts: {
  members: User[];
  guildId: string;
  announceChannelId: string | null;
  verifyChannelId: string;
}) {
  await removeDemoData();
  const now = new Date();
  const todayKst = kstDay(now);
  const dayOffset = (n: number) => kstDay(new Date(now.getTime() + n * DAY));
  const startDay = dayOffset(-3);
  const startAt = kst(startDay, "00:00");
  // 비대면 미션이 하루 1개씩 모두 공지될 때까지가 시즌이다
  const endAt = new Date(kst(dayOffset(REMOTE_MISSIONS.length - 4), "23:59").getTime() + 59_999);

  // 활성 시즌은 하나뿐이다
  await db.event.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const event = await db.event.create({
    data: {
      name: DEMO_EVENT_NAME,
      startAt,
      endAt,
      guildId: opts.guildId,
      announceChannelId: opts.announceChannelId,
      verifyChannelId: opts.verifyChannelId,
      prize1: "치킨 기프티콘 + 상품권 3만원",
      prize2: "치킨 기프티콘",
      prizeRaffle: "커피 기프티콘",
      faceAnnouncedAt: startAt,
      isActive: true,
    },
  });

  // 대면 미션 1~5번, 비대면 미션은 그 다음 번호부터 하루 1개.
  // 비대면 미션이 빙고판 칸(20칸)보다 훨씬 많아서, 공지됐지만 우리 판에는 없는 미션이 생긴다
  // 왕복 횟수를 줄이려고 한 번에 만든다 (운영 DB가 멀 수 있다)
  const byNumber = (x: Mission, y: Mission) => x.number - y.number;
  const face = (
    await db.mission.createManyAndReturn({
      data: FACE_MISSIONS.map(([title, description = "", requirePhoto = true], i) => ({
        eventId: event.id,
        number: i + 1,
        type: "FACE" as const,
        title,
        description,
        requirePhoto,
      })),
    })
  ).sort(byNumber);
  const remote = (
    await db.mission.createManyAndReturn({
      data: REMOTE_MISSIONS.map(([title, description = "", requirePhoto = true], i) => {
        const day = dayOffset(i - 3);
        const isToday = day === todayKst;
        // 오늘 미션은 지금 열려 있도록 (데모를 언제 돌려도 인증해 볼 수 있게)
        const publishAt = isToday ? new Date(now.getTime() - HOUR) : kst(day, "07:00");
        const deadlineAt = isToday ? new Date(now.getTime() + 6 * HOUR) : new Date(kst(day, "23:59").getTime() + 59_999);
        return {
          eventId: event.id,
          number: FACE_MISSIONS.length + i + 1,
          type: "REMOTE" as const,
          title,
          description,
          requirePhoto,
          day,
          publishAt,
          deadlineAt,
          // 오늘 미션은 일부러 공지하지 않아, 봇을 켜면 공지 채널에 올라가는지 볼 수 있다
          announcedAt: isToday || publishAt > now ? null : publishAt,
        };
      }),
    })
  ).sort(byNumber);
  const todayMission = remote[3];

  // 사용자: 데모 14명 + 1조에 함께 들어갈 실제 운영진(opts.members)
  const users: User[] = (
    await db.user.createManyAndReturn({ data: USER_NAMES.map((name, i) => ({ discordId: `${DEMO_PREFIX}u${i}`, name })) })
  ).sort((x, y) => Number(x.discordId.slice(DEMO_PREFIX.length + 1)) - Number(y.discordId.slice(DEMO_PREFIX.length + 1)));
  await db.user.upsert({ where: { discordId: "dev-admin" }, create: { discordId: "dev-admin", name: "운영진", isAdmin: true }, update: {} });
  const realUsers = opts.members;

  // 팀 편성: 1조에 실제 계정을 넣어 직접 /인증을 해볼 수 있게 한다
  const groups: (typeof users)[] = [[...realUsers, users[0]].slice(0, 3)];
  let cursor = 1;
  for (let t = 1; t < TEAM_NAMES.length; t++) {
    const size = t % 2 === 0 ? 3 : 2;
    groups.push(users.slice(cursor, cursor + size));
    cursor += size;
  }
  const teams = [];
  for (const [i, members] of groups.entries()) {
    const team = await db.team.create({
      data: { eventId: event.id, number: i + 1, name: TEAM_NAMES[i], color: i % 2 === 0 ? "MINT" : "PINK", submittedAt: new Date(startAt.getTime() - DAY) },
    });
    await db.teamMember.createMany({ data: members.map((u) => ({ eventId: event.id, teamId: team.id, userId: u.id })) });
    // 빙고판: ★ 5칸은 대면, 나머지 20칸은 비대면. 1조는 오늘 미션을 반드시 포함
    const faceIds = shuffle(face.map((m) => m.id)).slice(0, FACE_POSITIONS.length);
    const remoteIds = shuffle(remote.filter((m) => m.id !== todayMission.id).map((m) => m.id)).slice(0, CELL_COUNT - FACE_POSITIONS.length - 1);
    remoteIds.push(todayMission.id);
    shuffle(remoteIds);
    const cells = [];
    let f = 0;
    let r = 0;
    for (let p = 0; p < CELL_COUNT; p++) cells.push({ teamId: team.id, position: p, missionId: FACE_POSITIONS.includes(p) ? faceIds[f++] : remoteIds[r++] });
    await db.teamCell.createMany({ data: cells });
    teams.push({ team, members, cells });
  }

  // 지난 비대면 미션과 대면 미션에 대한 인증을 실제 인증 로직으로 쌓는다
  let ok = 0;
  let skipped = 0;
  let n = 0;
  const send = async (member: (typeof users)[number], mission: (typeof remote)[number], postedAt: Date) => {
    const res = await processSubmission({
      discordUserId: member.discordId,
      interactionId: `seed-${n++}`,
      channelId: opts.verifyChannelId,
      missionNumber: mission.number,
      attachmentUrls: mission.requirePhoto ? [photo(`${mission.number}번`)] : [],
      postedAt,
    });
    if (res.ok) ok++;
    else skipped++;
  };
  for (const [ti, t] of teams.entries()) {
    for (const m of remote.slice(0, 3)) {
      if (Math.random() > 0.75) continue;
      await send(t.members[0], m, new Date(m.publishAt!.getTime() + (30 + ti * 7) * 60_000));
    }
    for (const m of face.slice(0, 4)) {
      if (Math.random() > 0.35) continue;
      await send(t.members[t.members.length - 1], m, new Date(startAt.getTime() + (ti + 2) * HOUR * 5));
    }
    // 1조는 오늘 미션을 일부러 남겨 둔다
    if (ti > 0 && Math.random() > 0.5) await send(t.members[0], todayMission, new Date(now.getTime() - 20 * 60_000));
  }
  return {
    summary: `대면 ${face.length} · 비대면 ${remote.length} · 팀 ${teams.length} · 인증 ${ok}건 (조건 불충족 ${skipped}건)`,
    today: `${todayMission.number}번 ${todayMission.title}`,
  };
}

