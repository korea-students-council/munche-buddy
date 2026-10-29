import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, EmptyState, PageTitle, StatCard, btn } from "@/components/ui";
import { BingoBoard } from "@/components/bingo-board";
import { eventPhase, getActiveEvent, getTodayRemoteMission } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { toBoardCells } from "@/lib/board-view";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";

/** 다른 팀의 빙고판과 진행 상황을 볼 수 있는 페이지 */
export default async function TeamBoardPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const [user, event] = await Promise.all([getCurrentUser(), getActiveEvent()]);
  if (!event) return <EmptyState>진행 중인 시즌이 없어요.</EmptyState>;

  const state = await getTeamBoardState(event.id, teamId);
  if (!state || state.team.eventId !== event.id) notFound();
  const { team, cells, evaluation } = state;

  const back = (
    <Link href="/ranking" className={btn.secondary}>
      ← 랭킹
    </Link>
  );

  // 시작 전에는 다른 팀이 어떤 미션을 골랐는지 볼 수 없다 (판이 잠기기 전의 정보 보호)
  const now = new Date();
  if (eventPhase(event, now) === "upcoming") {
    return (
      <>
        <PageTitle title={`${team.number}조`} action={back} />
        <EmptyState>
          <p className="text-xl font-black tracking-[-0.03em] text-ink">시즌이 시작되면 볼 수 있어요</p>
          <p className="mt-1">빙고판이 잠기기 전에는 다른 팀의 미션 선택을 공개하지 않아요.</p>
        </EmptyState>
      </>
    );
  }
  if (!team.submittedAt) {
    return (
      <>
        <PageTitle title={`${team.number}조`} action={back} />
        <EmptyState>이 팀은 빙고판을 제출하지 않았어요.</EmptyState>
      </>
    );
  }

  const [standings, myTeamId, today] = await Promise.all([
    getStandings(event.id),
    user ? getTeamOfUser(event.id, user.id) : null,
    getTodayRemoteMission(event.id, now),
  ]);
  const rank = standings.find((s) => s.teamId === team.id)?.rank;
  const mine = team.id === myTeamId;

  return (
    <>
      <PageTitle title={team.name || `${team.number}조`} desc={`${team.number}조 · ${event.name}`} action={back} />

      <div className="mb-5 flex flex-wrap items-center gap-1.5 px-1">
        {mine && <Badge tone="ink">우리 팀</Badge>}
        {team.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] font-bold">
            <Avatar name={m.user.name} src={m.user.avatar} size={24} />
            {m.user.name}
          </span>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2 sm:max-w-xl">
        <StatCard label="순위" value={rank ? `${rank}위` : "-"} sub={`${standings.filter((s) => s.submitted).length}팀 중`} bg="bg-white" />
        <StatCard label="빙고" value={`${evaluation.lines}줄`} sub={`최대 ${maxLines(BOARD_SIZE)}줄`} bg="bg-mint-soft" />
        <StatCard label="채운 칸" value={`${evaluation.filled}`} sub={`/ ${CELL_COUNT}칸`} bg="bg-white" />
        <StatCard label="대면" value={`${evaluation.faceCount}`} sub={`/ ${FACE_COUNT}개`} bg="bg-pink-soft" />
      </div>

      <BingoBoard
        n={BOARD_SIZE}
        color={team.color}
        cells={toBoardCells(cells, evaluation.completedLines, event, today?.id ?? null, now)}
        withCommand={mine}
      />
      {mine && (
        <p className="mt-5 px-1 text-xs text-muted">
          <Link href="/board" className="font-bold underline decoration-mint decoration-2 underline-offset-4">
            우리 팀 빙고로 가기
          </Link>
        </p>
      )}
    </>
  );
}
