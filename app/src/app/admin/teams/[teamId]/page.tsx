import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, EmptyState, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { BingoBoard } from "@/components/bingo-board";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { getTeamBoardState } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { toBoardCells } from "@/lib/board-view";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";
import { formatKst } from "@/lib/time";
import { addManualSubmission } from "../../actions";

export default async function TeamDetail({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [{ teamId }, sp] = await Promise.all([params, searchParams]);
  const event = await getActiveEvent();
  if (!event) return <EmptyState>활성 시즌이 없어요.</EmptyState>;
  const state = await getTeamBoardState(event.id, teamId);
  if (!state || state.team.eventId !== event.id) notFound();
  const { team, cells, evaluation } = state;

  const subs = await db.submission.findMany({
    where: { teamId },
    orderBy: { postedAt: "desc" },
    include: { mission: true, user: true },
  });
  const todo = cells.filter((c) => !c.filledAt);

  return (
    <>
      <PageTitle
        title={`${team.number}조 ${team.name || "(팀명 미정)"}`}
        desc={`빙고 ${evaluation.lines}/${maxLines(BOARD_SIZE)}줄 · ${evaluation.filled}/${CELL_COUNT}칸 · 대면 ${evaluation.faceCount}/${FACE_COUNT}`}
        action={
          <Link href="/admin/teams" className={btn.secondary}>
            ← 팀 목록
          </Link>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-5 flex flex-wrap gap-2">
        {team.members.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-bold">
            <Avatar name={m.user.name} src={m.user.avatar} size={24} />
            {m.user.name}
          </span>
        ))}
      </div>

      {cells.length === 0 ? (
        <EmptyState>이 팀은 아직 빙고판을 제출하지 않았어요.</EmptyState>
      ) : (
        <BingoBoard
          n={BOARD_SIZE}
          color={team.color}
          withCommand={false}
          cells={toBoardCells(cells, evaluation.completedLines, event, null)}
        />
      )}

      {todo.length > 0 && (
        <Card className="mt-8">
          <h2 className="font-black">수동 인증 처리</h2>
          <p className="mb-3 mt-1 text-xs text-muted">디스코드를 거치지 않고 운영진이 직접 미션을 인정해요. (예: 대면 미션을 현장에서 확인한 경우)</p>
          <form action={addManualSubmission} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="teamId" value={team.id} />
            <Field label="미션">
              <select name="missionId" className={`${inputCls} !w-72`} defaultValue="">
                <option value="" disabled>
                  아직 인증하지 않은 미션
                </option>
                {todo
                  .sort((a, b) => a.mission.number - b.mission.number)
                  .map((c) => (
                    <option key={c.missionId} value={c.missionId}>
                      {c.mission.number}번 {c.mission.title} ({c.mission.type === "FACE" ? "대면" : "비대면"})
                    </option>
                  ))}
              </select>
            </Field>
            <button className={btn.primary}>인정 처리</button>
          </form>
        </Card>
      )}

      <Card className="mt-8">
        <h2 className="mb-3 font-black">인증 내역 ({subs.length})</h2>
        <ul className="divide-y divide-line text-sm">
          {subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <b>
                  {s.mission.number}번 {s.mission.title}
                </b>{" "}
                <span className="text-xs text-muted">
                  {formatKst(s.postedAt)} · {s.source === "MANUAL" ? "수동" : s.user?.name}
                </span>
              </span>
              <Badge tone={s.status === "ACCEPTED" ? "good" : "bad"}>{s.status === "ACCEPTED" ? "인정" : `반려: ${s.rejectReason}`}</Badge>
            </li>
          ))}
          {subs.length === 0 && <li className="py-6 text-center text-muted">인증 내역이 없어요.</li>}
        </ul>
        <p className="mt-3 text-xs text-muted">반려·복구는 인증 검수 메뉴에서 할 수 있어요.</p>
      </Card>
    </>
  );
}
