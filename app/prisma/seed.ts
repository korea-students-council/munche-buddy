// 개발용 데모 데이터: 진행 중인 시즌 + 팀 6개 + 미션 + 인증 기록.
// 인증은 봇과 같은 processSubmission을 통과시켜 실제 규칙대로 쌓는다.
import type { Mission, User } from "@prisma/client";
import { db } from "../src/lib/db";
import { FACE_POSITIONS, CELL_COUNT } from "../src/lib/rules";
import { processSubmission } from "../src/lib/verify";
import { kstDay } from "../src/lib/time";

if (process.env.NODE_ENV === "production") throw new Error("운영 환경에서는 시드를 실행할 수 없어요.");

const FACE_TITLES = [
  "팀원 전원과 함께 식사하기", "캠퍼스 포토스팟에서 단체 사진", "같이 운동하기 (30분 이상)", "카페에서 팀 회의하기",
  "서로의 장점 3가지 이야기하기", "함께 봉사활동 참여하기", "팀 단체 티 맞춰 입기", "학교 행사 함께 참여하기",
];
const REMOTE_TITLES = [
  "아침 7시 전에 일어나기", "물 2L 마시기", "오늘 하늘 사진 찍기", "10분 스트레칭", "계단으로만 이동하기",
  "친구에게 안부 연락하기", "책 10쪽 읽기", "방 정리하기", "새로운 음식 먹어보기", "산책 30분",
  "감사한 일 3가지 쓰기", "SNS 1시간 끊기", "오늘 배운 것 공유하기", "손으로 편지 쓰기", "대중교통에서 책 읽기",
  "건강한 점심 먹기", "스쿼트 30개", "쓰레기 줍기", "칭찬 한 마디 하기", "일기 쓰기",
  "노래 한 곡 따라 부르기", "플랭크 1분", "하루 만 보 걷기", "일찍 잠들기",
];
const TEAM_NAMES = ["반짝반짝 짝꽁", "솜사탕 팀", "초록이들", "달콤한 짝꽁", "구름 위의 짝꿍들", "토끼굴 탐험대"];
const USER_NAMES = ["민준", "서연", "지호", "하은", "도윤", "수아", "예준", "지우", "시우", "서윤", "하준", "채원", "주원", "다은"];
const VERIFY_CHANNEL = process.env.SEED_VERIFY_CHANNEL_ID ?? "demo-verify-channel";
const ANNOUNCE_CHANNEL = process.env.SEED_ANNOUNCE_CHANNEL_ID ?? "demo-announce-channel";

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

async function main() {
  await db.event.deleteMany();
  await db.user.deleteMany({ where: { discordId: { startsWith: "dev-" } } });

  const now = new Date();
  const todayKst = kstDay(now);
  const dayOffset = (n: number) => kstDay(new Date(now.getTime() + n * DAY));
  const startDay = dayOffset(-3);
  const startAt = kst(startDay, "00:00");
  const endAt = new Date(kst(dayOffset(17), "23:59").getTime() + 59_999);

  const event = await db.event.create({
    data: {
      name: "짝꽁 사업 데모",
      startAt,
      endAt,
      guildId: process.env.DISCORD_GUILD_ID ?? "demo-guild",
      announceChannelId: ANNOUNCE_CHANNEL,
      verifyChannelId: VERIFY_CHANNEL,
      prize1: "치킨 기프티콘 + 상품권 3만원",
      prize2: "치킨 기프티콘",
      prizeRaffle: "커피 기프티콘",
      faceAnnouncedAt: startAt,
      isActive: true,
    },
  });

  // 대면 미션 1~8번 (7번은 사진 선택), 비대면 미션 9번~: 하루 1개
  const face: Mission[] = [];
  for (const [i, title] of FACE_TITLES.entries()) {
    face.push(await db.mission.create({ data: { eventId: event.id, number: i + 1, type: "FACE", title, requirePhoto: i !== 6 } }));
  }
  const remote: Mission[] = [];
  for (const [i, title] of REMOTE_TITLES.entries()) {
    const day = dayOffset(i - 3);
    const isToday = day === todayKst;
    // 오늘 미션은 지금 열려 있도록 (데모를 언제 돌려도 인증해 볼 수 있게)
    const publishAt = isToday ? new Date(now.getTime() - HOUR) : kst(day, "07:00");
    const deadlineAt = isToday ? new Date(now.getTime() + 6 * HOUR) : new Date(kst(day, "23:59").getTime() + 59_999);
    remote.push(
      await db.mission.create({
        data: {
          eventId: event.id,
          number: FACE_TITLES.length + i + 1,
          type: "REMOTE",
          title,
          description: i % 4 === 0 ? "시계나 시간이 보이게 찍어주세요" : "",
          requirePhoto: i !== 4,
          day,
          publishAt,
          deadlineAt,
          // 오늘 미션은 일부러 공지하지 않아, 봇을 켜면 공지 채널에 올라가는지 볼 수 있다
          announcedAt: isToday || publishAt > now ? null : publishAt,
        },
      }),
    );
  }
  const todayMission = remote[3];

  // 사용자: 데모 14명 + 실제 로그인할 운영진(ADMIN_DISCORD_IDS)
  const users: User[] = [];
  for (const [i, name] of USER_NAMES.entries()) {
    users.push(await db.user.create({ data: { discordId: `dev-u${i}`, name } }));
  }
  await db.user.create({ data: { discordId: "dev-admin", name: "운영진", isAdmin: true } });
  const realIds = (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const realUsers: User[] = [];
  for (const id of realIds) {
    realUsers.push(await db.user.upsert({ where: { discordId: id }, create: { discordId: id, name: "운영진(나)", isAdmin: true }, update: {} }));
  }

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
      channelId: VERIFY_CHANNEL,
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
  console.log(`시드 완료: 대면 ${face.length} · 비대면 ${remote.length} · 팀 ${teams.length} · 인증 ${ok}건 (조건 불충족 ${skipped}건)`);
  console.log(`오늘의 비대면 미션: ${todayMission.number}번 ${todayMission.title} (1조는 아직 인증 전)`);
}

main().finally(() => db.$disconnect());
