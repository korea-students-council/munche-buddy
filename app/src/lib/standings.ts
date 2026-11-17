import { db } from "./db";
import { refreshAttachmentUrls } from "./discord";
import { BOARD_SIZE } from "./rules";
import { evaluateBoard, rankTeams, type BoardEvaluation, type CellFill } from "./bingo";
import type { TeamColor } from "@prisma/client";

export type Standing = BoardEvaluation & {
  rank: number;
  teamId: string;
  number: number;
  name: string;
  color: TeamColor;
  members: string[];
  submitted: boolean;
};

/** (teamId, missionId) → 인정된 인증 중 가장 이른 작성 시각 */
async function loadFillMap(eventId: string, teamId?: string) {
  const subs = await db.submission.findMany({
    where: { eventId, status: "ACCEPTED", ...(teamId ? { teamId } : {}) },
    select: { teamId: true, missionId: true, postedAt: true },
  });
  const map = new Map<string, Date>();
  for (const s of subs) {
    const key = `${s.teamId}:${s.missionId}`;
    const prev = map.get(key);
    if (!prev || s.postedAt < prev) map.set(key, s.postedAt);
  }
  return map;
}

export async function getStandings(eventId: string): Promise<Standing[]> {
  const [teams, fills] = await Promise.all([
    db.team.findMany({
      where: { eventId },
      orderBy: { number: "asc" },
      include: {
        members: { include: { user: { select: { name: true } } } },
        cells: { include: { mission: { select: { type: true } } } },
      },
    }),
    loadFillMap(eventId),
  ]);

  const rows = teams.map((t) => ({
    teamId: t.id,
    number: t.number,
    name: t.name,
    color: t.color,
    members: t.members.map((m) => m.user.name),
    submitted: t.submittedAt !== null,
    ...evaluateBoard(
      BOARD_SIZE,
      t.cells.map((c) => ({
        position: c.position,
        isFace: c.mission.type === "FACE",
        filledAt: fills.get(`${t.id}:${c.missionId}`) ?? null,
      })),
    ),
  }));

  return rankTeams(rows);
}

export type BoardCellView = CellFill & { missionId: string };

/** 한 팀의 빙고판 상태 (칸별 채움 시각 + 평가) */
export async function getTeamBoardState(eventId: string, teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: { include: { user: true } },
      cells: { orderBy: { position: "asc" }, include: { mission: true } },
    },
  });
  if (!team) return null;
  const fills = await loadFillMap(eventId, teamId);
  const cells: (BoardCellView & { mission: (typeof team.cells)[number]["mission"] })[] = team.cells.map((c) => ({
    position: c.position,
    missionId: c.missionId,
    mission: c.mission,
    isFace: c.mission.type === "FACE",
    filledAt: fills.get(`${teamId}:${c.missionId}`) ?? null,
  }));
  return { team, cells, evaluation: evaluateBoard(BOARD_SIZE, cells) };
}

/** 칸을 채운 인증 사진 (미션 id → 새로 받은 사진 주소). 가장 먼저 인정된 인증의 첫 사진을 쓴다 */
export async function getCellPhotos(eventId: string, teamId: string) {
  const subs = await db.submission.findMany({
    where: { eventId, teamId, status: "ACCEPTED", NOT: { attachmentUrls: { isEmpty: true } } },
    orderBy: { postedAt: "asc" },
    select: { missionId: true, attachmentUrls: true },
  });
  const first = new Map<string, string>();
  subs.forEach((s) => !first.has(s.missionId) && first.set(s.missionId, s.attachmentUrls[0]));
  const fresh = await refreshAttachmentUrls([...first.values()]);
  return new Map([...first].map(([m, u]) => [m, fresh.get(u) ?? u]));
}

/** 로그인한 사용자가 속한 팀 (이 시즌) */
export async function getTeamOfUser(eventId: string, userId: string) {
  const m = await db.teamMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { teamId: true },
  });
  return m?.teamId ?? null;
}
