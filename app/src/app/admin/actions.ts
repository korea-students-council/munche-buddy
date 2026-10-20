"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { drawRaffle } from "@/lib/raffle";
import { fetchGuildMember } from "@/lib/discord";
import { safeNext } from "@/lib/env";
import { TEAM_MAX, TEAM_MIN } from "@/lib/rules";
import { getCurrentUser } from "@/lib/session";
import { getStandings } from "@/lib/standings";
import { fromKstInput, kstDate } from "@/lib/time";

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("권한이 없습니다.");
  return user;
}

/** 처리 결과를 쿼리스트링(ok/error)에 실어 되돌아간다 */
function back(path: string, kind: "ok" | "error", message: string): never {
  const u = new URL(safeNext(path), "http://local");
  u.searchParams.delete("ok");
  u.searchParams.delete("error");
  u.searchParams.set(kind, message);
  redirect(u.pathname + u.search);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** 마감 시각은 "그 분이 끝날 때까지" 인정한다 (23:59 → 23:59:59.999) */
const endOfMinute = (d: Date) => new Date(d.getTime() + 59_999);

// ── 시즌 ─────────────────────────────────────────────────────

const eventSchema = z.object({
  name: z.string().min(1, "시즌 이름을 입력해 주세요.").max(60),
  guildId: z.string().max(30),
  announceChannelId: z.string().max(30),
  verifyChannelId: z.string().max(30),
  prize1: z.string().max(100),
  prize2: z.string().max(100),
  prizeRaffle: z.string().max(100),
});

export async function saveEvent(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const base = id ? "/admin/event" : "/admin/event?new=1";

  const parsed = eventSchema.safeParse({
    name: str(fd, "name"),
    guildId: str(fd, "guildId"),
    announceChannelId: str(fd, "announceChannelId"),
    verifyChannelId: str(fd, "verifyChannelId"),
    prize1: str(fd, "prize1"),
    prize2: str(fd, "prize2"),
    prizeRaffle: str(fd, "prizeRaffle"),
  });
  if (!parsed.success) back(base, "error", parsed.error.issues[0].message);

  const startAt = fromKstInput(str(fd, "startAt"));
  const endRaw = fromKstInput(str(fd, "endAt"));
  if (!startAt || !endRaw) back(base, "error", "시작·최종 마감 일시를 입력해 주세요.");
  const endAt = endOfMinute(endRaw);
  if (endAt <= startAt) back(base, "error", "최종 마감은 시작보다 뒤여야 해요.");

  const d = parsed.data;
  const data = {
    name: d.name,
    startAt,
    endAt,
    guildId: d.guildId || null,
    announceChannelId: d.announceChannelId || null,
    verifyChannelId: d.verifyChannelId || null,
    prize1: d.prize1,
    prize2: d.prize2,
    prizeRaffle: d.prizeRaffle,
  };

  if (id) {
    await db.event.update({ where: { id }, data });
    back("/admin/event", "ok", "시즌 설정을 저장했어요.");
  }
  await db.$transaction([
    db.event.updateMany({ data: { isActive: false } }),
    db.event.create({ data: { ...data, isActive: true } }),
  ]);
  back("/admin/event", "ok", "새 시즌을 만들고 활성화했어요.");
}

export async function activateEvent(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  await db.$transaction([
    db.event.updateMany({ data: { isActive: false } }),
    db.event.update({ where: { id }, data: { isActive: true } }),
  ]);
  back("/admin/event", "ok", "해당 시즌을 활성화했어요.");
}

// ── 미션 ─────────────────────────────────────────────────────

/** 한 줄에 하나: "제목" 또는 "제목 | 설명". 번호는 이어서 자동 부여 */
export async function addMissions(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const type = str(fd, "type") === "FACE" ? "FACE" : "REMOTE";
  const requirePhoto = str(fd, "photo") !== "optional";
  const lines = str(fd, "titles")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) back("/admin/missions", "error", "미션을 한 줄에 하나씩 입력해 주세요.");
  if (lines.length > 200) back("/admin/missions", "error", "한 번에 200개까지 추가할 수 있어요.");

  const last = await db.mission.aggregate({ where: { eventId }, _max: { number: true } });
  const start = (last._max.number ?? 0) + 1;
  await db.mission.createMany({
    data: lines.map((line, i) => {
      const [title, ...rest] = line.split("|");
      return {
        eventId,
        number: start + i,
        type,
        requirePhoto,
        title: title.trim().slice(0, 100),
        description: rest.join("|").trim().slice(0, 300),
      };
    }),
  });
  back("/admin/missions", "ok", `${lines.length}개의 ${type === "FACE" ? "대면" : "비대면"} 미션을 ${start}번부터 추가했어요.`);
}

export async function updateMission(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!title) back("/admin/missions", "error", "미션 제목을 입력해 주세요.");
  const number = Number(str(fd, "number"));
  if (!Number.isInteger(number) || number < 1) back("/admin/missions", "error", "번호는 1 이상의 정수여야 해요.");
  const type = str(fd, "type") === "FACE" ? "FACE" : "REMOTE";

  // 비대면: 공지 날짜 + 공지/마감 시각. 대면: 일정 없음(시즌 전체가 인증 기간)
  let schedule: { day: string | null; publishAt: Date | null; deadlineAt: Date | null } = {
    day: null,
    publishAt: null,
    deadlineAt: null,
  };
  const day = str(fd, "day");
  if (type === "REMOTE" && day) {
    const publishAt = kstDate(day, str(fd, "publishTime") || "07:00");
    const closeAt = kstDate(day, str(fd, "deadlineTime") || "23:59");
    if (!publishAt || !closeAt) back("/admin/missions", "error", "공지 날짜와 시각을 확인해 주세요.");
    const deadlineAt = endOfMinute(closeAt);
    if (deadlineAt <= publishAt) back("/admin/missions", "error", "마감 시각은 공지 시각보다 늦어야 해요.");
    schedule = { day, publishAt, deadlineAt };
  }

  const current = await db.mission.findUnique({ where: { id } });
  if (!current) back("/admin/missions", "error", "미션을 찾을 수 없어요.");
  const publishChanged = current.publishAt?.getTime() !== schedule.publishAt?.getTime();

  try {
    await db.mission.update({
      where: { id },
      data: {
        number,
        type,
        title: title.slice(0, 100),
        description: str(fd, "description").slice(0, 300),
        requirePhoto: str(fd, "photo") !== "optional",
        ...schedule,
        // 공지 시각을 미래로 옮기면 다시 공지되도록 초기화
        ...(publishChanged && (!schedule.publishAt || schedule.publishAt > new Date()) ? { announcedAt: null } : {}),
      },
    });
  } catch (e) {
    const err = e as { code?: string; meta?: { target?: string[] } };
    if (err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      back(
        "/admin/missions",
        "error",
        target.includes("number") ? `${number}번은 이미 다른 미션이 쓰고 있어요.` : `${day}에는 이미 다른 비대면 미션이 배정되어 있어요.`,
      );
    }
    throw e;
  }
  back("/admin/missions", "ok", `${number}번 미션을 저장했어요.`);
}

export async function deleteMission(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const used = await db.teamCell.count({ where: { missionId: id } });
  if (used > 0) back("/admin/missions", "error", `${used}개 팀의 빙고판에 쓰이고 있어 삭제할 수 없어요.`);
  await db.mission.delete({ where: { id } });
  back("/admin/missions", "ok", "미션을 삭제했어요.");
}

/** 일정이 없는 비대면 미션을 시작 날짜부터 하루에 하나씩 자동 배정 (기본 07:00 공지, 23:59 마감) */
export async function autoSchedule(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const startDay = str(fd, "startDay");
  const pubTime = str(fd, "publishTime") || "07:00";
  const dlTime = str(fd, "deadlineTime") || "23:59";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay)) back("/admin/missions", "error", "시작 날짜를 선택해 주세요.");
  if (dlTime <= pubTime) back("/admin/missions", "error", "마감 시각은 공지 시각보다 늦어야 해요.");

  const [unscheduled, used] = await Promise.all([
    db.mission.findMany({ where: { eventId, type: "REMOTE", day: null }, orderBy: { number: "asc" } }),
    db.mission.findMany({ where: { eventId, day: { not: null } }, select: { day: true } }),
  ]);
  if (unscheduled.length === 0) back("/admin/missions", "error", "일정이 없는 비대면 미션이 없어요.");

  const order = [...unscheduled];
  if (fd.get("shuffle") === "on") {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  const taken = new Set(used.map((u) => u.day));
  const [y, m, d] = startDay.split("-").map(Number);
  let cursor = Date.UTC(y, m - 1, d);
  const updates = [];
  for (const mission of order) {
    let day = new Date(cursor).toISOString().slice(0, 10);
    while (taken.has(day)) {
      cursor += 86400000;
      day = new Date(cursor).toISOString().slice(0, 10);
    }
    taken.add(day);
    cursor += 86400000;
    updates.push(
      db.mission.update({
        where: { id: mission.id },
        data: {
          day,
          publishAt: kstDate(day, pubTime),
          deadlineAt: endOfMinute(kstDate(day, dlTime)!),
          announcedAt: null,
        },
      }),
    );
  }
  await db.$transaction(updates);
  back("/admin/missions", "ok", `${updates.length}개의 비대면 미션에 일정을 배정했어요.`);
}

// ── 팀 편성 ──────────────────────────────────────────────────

const DISCORD_ID = /^\d{15,25}$/;

/**
 * 팀 일괄 만들기. 한 줄이 한 팀이고, 팀원은 쉼표/공백으로 구분한 디스코드 ID(또는 이미 로그인한 사용자의 이름).
 * 아직 로그인하지 않은 ID는 미리 등록해 두고, 로그인하면 자동으로 연결된다.
 */
export async function bulkCreateTeams(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const lines = str(fd, "text")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) back("/admin/teams", "error", "팀을 한 줄에 하나씩 입력해 주세요.");

  const [users, assigned, last] = await Promise.all([
    db.user.findMany(),
    db.teamMember.findMany({ where: { eventId }, select: { userId: true } }),
    db.team.aggregate({ where: { eventId }, _max: { number: true } }),
  ]);
  const byDiscord = new Map(users.map((u) => [u.discordId, u]));
  const byName = new Map<string, typeof users>();
  users.forEach((u) => byName.set(u.name, [...(byName.get(u.name) ?? []), u]));
  const alreadyIn = new Set(assigned.map((a) => a.userId));

  const parsedLines: { discordId: string; name: string }[][] = [];
  const seen = new Set<string>();
  for (const [i, line] of lines.entries()) {
    const tokens = line.split(/[,\s]+/).filter(Boolean);
    if (tokens.length < TEAM_MIN || tokens.length > TEAM_MAX) {
      back("/admin/teams", "error", `${i + 1}번째 줄: 팀원은 ${TEAM_MIN}~${TEAM_MAX}명이어야 해요. (${tokens.length}명)`);
    }
    const members: { discordId: string; name: string }[] = [];
    for (const t of tokens) {
      let discordId: string;
      let name = `(로그인 전) ${t.slice(-4)}`;
      if (DISCORD_ID.test(t)) {
        discordId = t;
        name = byDiscord.get(t)?.name ?? name;
      } else {
        const matches = byName.get(t) ?? [];
        if (matches.length !== 1) {
          back("/admin/teams", "error", `${i + 1}번째 줄: "${t}" 은(는) 디스코드 ID(숫자)이거나, 로그인한 사용자 중 이름이 유일해야 해요.`);
        }
        discordId = matches[0].discordId;
        name = matches[0].name;
      }
      if (seen.has(discordId)) back("/admin/teams", "error", `${i + 1}번째 줄: "${t}" 이(가) 여러 팀에 중복되어 있어요.`);
      const existing = byDiscord.get(discordId);
      if (existing && alreadyIn.has(existing.id)) back("/admin/teams", "error", `${i + 1}번째 줄: "${t}" 은(는) 이미 다른 팀에 속해 있어요.`);
      seen.add(discordId);
      members.push({ discordId, name });
    }
    parsedLines.push(members);
  }

  let number = last._max.number ?? 0;
  await db.$transaction(async (tx) => {
    for (const members of parsedLines) {
      number += 1;
      const team = await tx.team.create({ data: { eventId, number } });
      for (const m of members) {
        const user = await tx.user.upsert({
          where: { discordId: m.discordId },
          create: { discordId: m.discordId, name: m.name },
          update: {},
        });
        await tx.teamMember.create({ data: { eventId, teamId: team.id, userId: user.id } });
      }
    }
  });
  back("/admin/teams", "ok", `${parsedLines.length}개 팀을 만들었어요.`);
}

export async function createTeam(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const last = await db.team.aggregate({ where: { eventId }, _max: { number: true } });
  const number = (last._max.number ?? 0) + 1;
  await db.team.create({ data: { eventId, number } });
  back("/admin/teams", "ok", `${number}조를 만들었어요.`);
}

export async function addTeamMember(fd: FormData) {
  await assertAdmin();
  const teamId = str(fd, "teamId");
  const userId = str(fd, "userId");
  if (!userId) back("/admin/teams", "error", "추가할 참여자를 선택해 주세요.");
  const team = await db.team.findUnique({ where: { id: teamId }, include: { _count: { select: { members: true } } } });
  if (!team) back("/admin/teams", "error", "팀을 찾을 수 없어요.");
  if (team._count.members >= TEAM_MAX) back("/admin/teams", "error", `팀은 최대 ${TEAM_MAX}명까지예요.`);
  try {
    await db.teamMember.create({ data: { eventId: team.eventId, teamId, userId } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") back("/admin/teams", "error", "이미 다른 팀에 속한 참여자예요.");
    throw e;
  }
  back("/admin/teams", "ok", `${team.number}조에 팀원을 추가했어요.`);
}

/**
 * 디스코드 서버 멤버를 팀에 넣는다. 아직 웹에 로그인하지 않은 멤버도 바로 편성할 수 있고,
 * 로그인하면 같은 디스코드 ID로 자동 연결된다.
 */
export async function assignMember(fd: FormData) {
  await assertAdmin();
  const teamId = str(fd, "teamId");
  const discordId = str(fd, "discordId");
  if (!discordId) back("/admin/teams", "error", "추가할 멤버를 선택해 주세요.");

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { event: true, _count: { select: { members: true } } },
  });
  if (!team) back("/admin/teams", "error", "팀을 찾을 수 없어요.");
  if (team._count.members >= TEAM_MAX) back("/admin/teams", "error", `팀은 최대 ${TEAM_MAX}명까지예요.`);

  const guildId = team.event.guildId ?? process.env.DISCORD_GUILD_ID;
  const member = guildId ? await fetchGuildMember(guildId, discordId) : undefined;
  if (member === null) back("/admin/teams", "error", "이 사람은 디스코드 서버에 없어요.");

  const existing = await db.user.findUnique({ where: { discordId } });
  const info = member ?? (existing ? { id: existing.discordId, name: existing.name, avatar: existing.avatar } : null);
  if (!info) back("/admin/teams", "error", "멤버 정보를 가져오지 못했어요. 디스코드 연동 설정을 확인해 주세요.");

  const user = await db.user.upsert({
    where: { discordId },
    create: { discordId, name: info.name, avatar: info.avatar },
    update: { name: info.name, avatar: info.avatar },
  });
  try {
    await db.teamMember.create({ data: { eventId: team.eventId, teamId, userId: user.id } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") back("/admin/teams", "error", `${info.name}님은 이미 다른 팀에 속해 있어요.`);
    throw e;
  }
  back("/admin/teams", "ok", `${info.name}님을 ${team.number}조에 넣었어요.`);
}

/** 팀원을 다른 팀으로 옮긴다 */
export async function moveMember(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const toTeamId = str(fd, "toTeamId");
  if (!toTeamId) back("/admin/teams", "error", "옮길 팀을 선택해 주세요.");
  const [member, target] = await Promise.all([
    db.teamMember.findUnique({ where: { id }, include: { user: true } }),
    db.team.findUnique({ where: { id: toTeamId }, include: { _count: { select: { members: true } } } }),
  ]);
  if (!member || !target) back("/admin/teams", "error", "팀원 또는 팀을 찾을 수 없어요.");
  if (target._count.members >= TEAM_MAX) back("/admin/teams", "error", `${target.number}조는 이미 ${TEAM_MAX}명이에요.`);
  await db.teamMember.update({ where: { id }, data: { teamId: toTeamId } });
  back("/admin/teams", "ok", `${member.user.name}님을 ${target.number}조로 옮겼어요.`);
}

export async function removeTeamMember(fd: FormData) {
  await assertAdmin();
  await db.teamMember.delete({ where: { id: str(fd, "id") } });
  back("/admin/teams", "ok", "팀원을 뺐어요.");
}

export async function deleteTeam(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  const subs = await db.submission.count({ where: { teamId: id } });
  if (subs > 0) back("/admin/teams", "error", `인증 기록이 ${subs}건 있어 팀을 삭제할 수 없어요. 팀원을 빼서 비워 주세요.`);
  await db.team.delete({ where: { id } });
  back("/admin/teams", "ok", "팀을 삭제했어요.");
}

export async function toggleAdmin(fd: FormData) {
  const me = await assertAdmin();
  const userId = str(fd, "userId");
  if (userId === me.id) back("/admin/teams", "error", "본인의 어드민 권한은 직접 해제할 수 없어요.");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) back("/admin/teams", "error", "사용자를 찾을 수 없어요.");
  await db.user.update({ where: { id: userId }, data: { isAdmin: !user.isAdmin } });
  back("/admin/teams", "ok", `${user.name}님의 어드민 권한을 ${user.isAdmin ? "해제" : "부여"}했어요.`);
}

// ── 인증 검수 ────────────────────────────────────────────────

export async function rejectSubmission(fd: FormData) {
  const admin = await assertAdmin();
  const returnTo = str(fd, "returnTo") || "/admin/submissions";
  const reason = str(fd, "reason");
  if (!reason) back(returnTo, "error", "반려 사유를 입력해 주세요.");
  await db.submission.update({
    where: { id: str(fd, "id") },
    data: { status: "REJECTED", rejectReason: reason.slice(0, 300), reviewedById: admin.id, reviewedAt: new Date() },
  });
  back(returnTo, "ok", "인증을 반려했어요. 칸이 비워지고 순위가 다시 계산돼요.");
}

export async function restoreSubmission(fd: FormData) {
  const admin = await assertAdmin();
  const returnTo = str(fd, "returnTo") || "/admin/submissions";
  await db.submission.update({
    where: { id: str(fd, "id") },
    data: { status: "ACCEPTED", rejectReason: null, reviewedById: admin.id, reviewedAt: new Date() },
  });
  back(returnTo, "ok", "반려를 취소하고 인증을 복구했어요.");
}

/** 운영진이 직접 체크: 디스코드를 거치지 않고 팀의 미션을 인정 처리한다 */
export async function addManualSubmission(fd: FormData) {
  const admin = await assertAdmin();
  const teamId = str(fd, "teamId");
  const missionId = str(fd, "missionId");
  const back_ = `/admin/teams/${teamId}`;
  const team = await db.team.findUnique({ where: { id: teamId }, include: { cells: true } });
  if (!team) back("/admin/teams", "error", "팀을 찾을 수 없어요.");
  if (!team.cells.some((c) => c.missionId === missionId)) back(back_, "error", "이 팀의 빙고판에 없는 미션이에요.");
  await db.submission.create({
    data: {
      eventId: team.eventId,
      teamId,
      missionId,
      source: "MANUAL",
      externalId: `manual-${randomUUID()}`,
      attachmentUrls: [],
      postedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });
  back(back_, "ok", "수동으로 인증 처리했어요.");
}

// ── 순위·시상 ────────────────────────────────────────────────

/** 추첨 후보: 1·2등을 뺀 제출 팀. 쪽지 수 = 채운 칸 수 */
async function raffleCandidates(eventId: string, excludeTeamIds: string[]) {
  const standings = await getStandings(eventId);
  return standings.filter((s) => s.submitted && !excludeTeamIds.includes(s.teamId));
}

export async function drawRaffleAction(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const exclude = [str(fd, "first"), str(fd, "second")].filter(Boolean);
  const candidates = await raffleCandidates(eventId, exclude);
  const picked = drawRaffle(candidates.map((c) => ({ id: c.teamId, tickets: c.filled })));
  if (!picked) back("/admin/ranking", "error", "추첨할 팀이 없어요. (채운 칸이 있는 팀이 필요해요)");
  const t = candidates.find((c) => c.teamId === picked.id)!;
  await db.winner.upsert({
    where: { eventId_kind: { eventId, kind: "RAFFLE" } },
    create: { eventId, kind: "RAFFLE", teamId: t.teamId, lines: t.lines, filled: t.filled, faceCount: t.faceCount },
    update: { teamId: t.teamId, lines: t.lines, filled: t.filled, faceCount: t.faceCount, snapshotAt: new Date() },
  });
  const total = candidates.reduce((sum, c) => sum + c.filled, 0);
  back("/admin/ranking", "ok", `추첨 결과: ${t.number}조 ${t.name} 당첨! (쪽지 ${t.filled}장 보유 / 전체 ${total}장). 최종 확정을 누르면 공개돼요.`);
}

export async function finalizeEvent(fd: FormData) {
  await assertAdmin();
  const eventId = str(fd, "eventId");
  const picks = { FIRST: str(fd, "first"), SECOND: str(fd, "second"), RAFFLE: str(fd, "raffle") } as const;
  if (!picks.FIRST) back("/admin/ranking", "error", "1등 팀을 선택해 주세요.");
  const chosen = Object.values(picks).filter(Boolean);
  if (new Set(chosen).size !== chosen.length) back("/admin/ranking", "error", "같은 팀을 여러 상에 선택할 수 없어요.");

  const standings = await getStandings(eventId);
  const ops = [];
  for (const kind of ["FIRST", "SECOND", "RAFFLE"] as const) {
    const teamId = picks[kind];
    if (!teamId) {
      ops.push(db.winner.deleteMany({ where: { eventId, kind } }));
      continue;
    }
    const t = standings.find((s) => s.teamId === teamId);
    if (!t) back("/admin/ranking", "error", "선택한 팀을 찾을 수 없어요.");
    const data = { teamId, lines: t.lines, filled: t.filled, faceCount: t.faceCount, snapshotAt: new Date() };
    ops.push(db.winner.upsert({ where: { eventId_kind: { eventId, kind } }, create: { eventId, kind, ...data }, update: data }));
  }
  ops.push(db.event.update({ where: { id: eventId }, data: { finalizedAt: new Date() } }));
  await db.$transaction(ops);
  back("/admin/ranking", "ok", "최종 결과를 확정했어요. 이후 인증은 더 이상 반영되지 않아요.");
}

export async function unfinalizeEvent(fd: FormData) {
  await assertAdmin();
  await db.event.update({ where: { id: str(fd, "eventId") }, data: { finalizedAt: null } });
  back("/admin/ranking", "ok", "확정을 취소했어요. 다시 인증이 반영돼요.");
}
