import type { Event, Mission } from "@prisma/client";
import type { BoardCell } from "@/components/bingo-board";
import { allLines } from "./bingo";
import { BOARD_SIZE } from "./rules";
import { formatKst, remaining } from "./time";

type StateCell = { position: number; filledAt: Date | null; mission: Mission };

/** 팀 빙고판 상태를 화면용 칸 목록으로 바꾼다 (기한 안내 문구 포함) */
export function toBoardCells(
  cells: StateCell[],
  completedLines: number[],
  event: Pick<Event, "endAt">,
  todayMissionId: string | null,
  now = new Date(),
): BoardCell[] {
  const lines = allLines(BOARD_SIZE);
  const inLine = new Set<number>();
  completedLines.forEach((i) => lines[i].forEach((p) => inLine.add(p)));

  return cells.map(({ position, filledAt, mission: m }) => ({
    position,
    number: m.number,
    title: m.title,
    description: m.description,
    face: m.type === "FACE",
    requirePhoto: m.requirePhoto,
    filled: filledAt !== null,
    inLine: inLine.has(position),
    today: m.id === todayMissionId,
    when: describeWindow(m, event, filledAt, now),
  }));
}

function describeWindow(m: Mission, event: Pick<Event, "endAt">, filledAt: Date | null, now: Date): string {
  if (filledAt) return `${formatKst(filledAt)}에 인증을 마쳤어요.`;
  if (m.type === "FACE") {
    return now > event.endAt
      ? "최종 마감이 지나 더 이상 인증할 수 없어요."
      : `최종 마감 ${formatKst(event.endAt)}까지, 팀원 모두 만나서 함께해요.`;
  }
  if (!m.publishAt || m.publishAt > now) return "아직 공개되지 않은 미션이에요. 공지된 날 하루 동안만 인증할 수 있어요.";
  if (m.deadlineAt && m.deadlineAt < now) return `인증 기간이 지났어요. (마감 ${formatKst(m.deadlineAt)})`;
  return m.deadlineAt
    ? `오늘 ${formatKst(m.deadlineAt)}까지 인증해야 해요. ${remaining(m.deadlineAt, now)} 남았어요.`
    : "지금 인증할 수 있어요.";
}
