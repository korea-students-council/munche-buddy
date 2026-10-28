"use server";

import { db } from "@/lib/db";
import { eventPhase, getActiveEvent } from "@/lib/event";
import { CELL_COUNT, isFacePosition } from "@/lib/rules";
import { getCurrentUser } from "@/lib/session";

export type SaveBoardResult = { ok: true } | { ok: false; error: string };

export type SaveBoardInput = {
  name: string;
  color: "MINT" | "PINK";
  /** 칸 순서(position 0..24)대로 미션 id */
  cells: (string | null)[];
};

/** 팀원 누구나 시즌 시작 전까지 팀 빙고판을 저장/수정할 수 있다. 마지막에 저장한 내용이 적용된다. */
export async function saveTeamBoard(input: SaveBoardInput): Promise<SaveBoardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const event = await getActiveEvent();
  if (!event) return { ok: false, error: "진행 중인 시즌이 없어요." };
  if (eventPhase(event) !== "upcoming") return { ok: false, error: "시즌이 시작되어 빙고판을 바꿀 수 없어요." };

  const membership = await db.teamMember.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  });
  if (!membership) return { ok: false, error: "아직 팀에 배정되지 않았어요." };

  const name = String(input.name ?? "").trim();
  if (name.length < 1 || name.length > 20) return { ok: false, error: "팀명은 1~20자로 입력해 주세요." };
  if (input.color !== "MINT" && input.color !== "PINK") return { ok: false, error: "빙고판 색을 골라 주세요." };

  if (!Array.isArray(input.cells) || input.cells.length !== CELL_COUNT) {
    return { ok: false, error: "잘못된 요청이에요." };
  }
  const ids = input.cells.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (ids.length !== CELL_COUNT) return { ok: false, error: `모든 칸(${CELL_COUNT}개)을 채워 주세요.` };
  if (new Set(ids).size !== CELL_COUNT) return { ok: false, error: "같은 미션을 두 번 쓸 수 없어요." };

  const missions = await db.mission.findMany({
    where: { eventId: event.id, id: { in: ids } },
    select: { id: true, type: true, number: true },
  });
  if (missions.length !== CELL_COUNT) return { ok: false, error: "존재하지 않는 미션이 포함되어 있어요." };
  const byId = new Map(missions.map((m) => [m.id, m]));

  for (let position = 0; position < CELL_COUNT; position++) {
    const m = byId.get(input.cells[position]!)!;
    if (isFacePosition(position) && m.type !== "FACE") {
      return { ok: false, error: `대면 칸에는 대면 미션만 놓을 수 있어요. (${m.number}번은 비대면 미션)` };
    }
    if (!isFacePosition(position) && m.type !== "REMOTE") {
      return { ok: false, error: `대면 칸이 아닌 곳에는 비대면 미션만 놓을 수 있어요. (${m.number}번은 대면 미션)` };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.teamCell.deleteMany({ where: { teamId: membership.teamId } });
    await tx.teamCell.createMany({
      data: input.cells.map((missionId, position) => ({ teamId: membership.teamId, position, missionId: missionId! })),
    });
    await tx.team.update({
      where: { id: membership.teamId },
      data: { name, color: input.color, submittedAt: new Date() },
    });
  });

  return { ok: true };
}
