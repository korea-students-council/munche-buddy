import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, BingoGrid, EmptyState, PageTitle, StatCard, btn } from "@/components/ui";
import { eventPhase, getActiveEvent } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { allLines, maxLines } from "@/lib/bingo";
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
  if (eventPhase(event) === "upcoming") {
    return (
      <>
        <PageTitle title={`${team.number}조`} action={back} />
        <EmptyState>
          <p className="font-display text-xl text-ink">시즌이 시작되면 볼 수 있어요</p>
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

  const [standings, myTeamId] = await Promise.all([getStandings(event.id), user ? getTeamOfUser(event.id, user.id) : null]);
  const rank = standings.find((s) => s.teamId === team.id)?.rank;
  const lines = allLines(BOARD_SIZE);
  const inLine = new Set<number>();
  evaluation.completedLines.forEach((i) => lines[i].forEach((p) => inLine.add(p)));
  const mine = team.id === myTeamId;

  return (
    <>
      <PageTitle title={`${team.number}조 ${team.name}`} desc={event.name} action={back} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {mine && <Badge tone="sun">우리 팀</Badge>}
        {team.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white py-0.5 pl-0.5 pr-2 text-xs font-bold">
            <Avatar name={m.user.name} src={m.user.avatar} size={20} />
            {m.user.name}
          </span>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-4 gap-1.5 sm:gap-3">
        <StatCard label="현재 순위" value={rank ? `${rank}위` : "-"} sub={`${standings.filter((s) => s.submitted).length}팀 중`} bg="bg-sun-soft" />
        <StatCard label="빙고 줄" value={`${evaluation.lines}`} sub={`최대 ${maxLines(BOARD_SIZE)}줄`} bg="bg-mint-soft" />
        <StatCard label="채운 칸" value={`${evaluation.filled}`} sub={`/ ${CELL_COUNT}칸`} bg="bg-pink-soft" />
        <StatCard label="대면 미션" value={`${evaluation.faceCount}`} sub={`/ ${FACE_COUNT}개`} bg="bg-sky-soft" />
      </div>

      <BingoGrid
        n={BOARD_SIZE}
        color={team.color}
        cells={cells.map((c) => ({
          position: c.position,
          number: c.mission.number,
          title: c.mission.title,
          filled: c.filledAt !== null,
          inLine: inLine.has(c.position),
          face: c.mission.type === "FACE",
        }))}
      />
      <p className="mt-4 text-center text-xs text-muted">
        색이 칠해진 칸이 인증을 마친 미션이에요. ★ 칸은 대면 미션 칸이에요.
        {mine && (
          <>
            {" "}
            <Link href="/board" className="font-bold underline underline-offset-2">
              우리 팀 빙고로 가기
            </Link>
          </>
        )}
      </p>
    </>
  );
}
