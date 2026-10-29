import { Avatar, EmptyState, Notice, PageTitle, StatCard, btn } from "@/components/ui";
import { BingoBoard } from "@/components/bingo-board";
import Link from "next/link";
import { db } from "@/lib/db";
import { eventPhase, getActiveEvent, getTodayRemoteMission } from "@/lib/event";
import { requireUser } from "@/lib/session";
import { getStandings, getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { toBoardCells } from "@/lib/board-view";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT, REMOTE_COUNT } from "@/lib/rules";
import { formatKst, remaining } from "@/lib/time";
import { BoardEditor } from "./board-editor";

export default async function BoardPage() {
  const user = await requireUser("/board");
  const event = await getActiveEvent();
  if (!event) return <EmptyState>진행 중인 시즌이 없어요. 시즌이 열리면 팀 빙고판을 만들 수 있어요.</EmptyState>;

  const now = new Date();
  const phase = eventPhase(event, now);
  const teamId = await getTeamOfUser(event.id, user.id);
  if (!teamId) {
    return (
      <EmptyState href="/how-to" cta="이용 방법 보기">
        <p className="text-xl font-black tracking-[-0.03em] text-ink">아직 팀에 배정되지 않았어요</p>
        <p className="mt-1">운영진이 팀을 편성하면 우리 팀 빙고판이 열려요. 편성이 끝났는데도 보이지 않으면 운영진에게 문의해 주세요.</p>
      </EmptyState>
    );
  }
  const state = await getTeamBoardState(event.id, teamId);
  if (!state) return <EmptyState>팀 정보를 찾을 수 없어요.</EmptyState>;
  const { team } = state;
  const submitted = team.submittedAt !== null;

  const members = (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 px-1">
      {team.members.map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] font-bold">
          <Avatar name={m.user.name} src={m.user.avatar} size={24} />
          {m.user.name}
        </span>
      ))}
    </div>
  );

  // ── 시작 전: 팀 빙고판 편집 ────────────────────────────────
  if (phase === "upcoming") {
    const missions = await db.mission.findMany({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
      select: { id: true, number: true, title: true, description: true, type: true, requirePhoto: true },
    });
    const faceN = missions.filter((m) => m.type === "FACE").length;
    const remoteN = missions.length - faceN;
    const initial: (string | null)[] = Array(CELL_COUNT).fill(null);
    state.cells.forEach((c) => (initial[c.position] = c.missionId));

    return (
      <>
        <PageTitle
          title="우리 팀 빙고판 만들기"
          desc={`${team.number}조 · ${formatKst(event.startAt)}에 판이 잠겨요 (${remaining(event.startAt, now)} 남음)`}
        />
        {members}
        <p className="mb-5 px-1 text-sm text-sub">팀원 누구나 함께 수정할 수 있고, 마지막에 저장한 내용이 적용돼요.</p>
        {faceN < FACE_COUNT || remoteN < REMOTE_COUNT ? (
          <Notice tone="bad">
            미션이 아직 부족해요. 대면 {faceN}/{FACE_COUNT}개, 비대면 {remoteN}/{REMOTE_COUNT}개 이상이 필요해요. 운영진이 미션을 더 등록하면 만들 수 있어요.
          </Notice>
        ) : (
          <>
            {submitted && <Notice tone="good">빙고판을 제출했어요. 시작 전까지 자유롭게 수정할 수 있어요.</Notice>}
            <BoardEditor
              n={BOARD_SIZE}
              pool={missions}
              initial={initial}
              initialName={team.name}
              initialColor={team.color}
              alreadySubmitted={submitted}
            />
          </>
        )}
      </>
    );
  }

  // ── 시작 후: 제출하지 않은 팀은 참여 불가 ───────────────────
  if (!submitted) {
    return (
      <EmptyState href="/ranking" cta="랭킹 보기">
        <p className="text-xl font-black tracking-[-0.03em] text-ink">이번 시즌은 참여할 수 없어요</p>
        <p className="mt-1">시즌이 시작되기 전에 빙고판을 제출한 팀만 참여할 수 있어요. 궁금한 점은 운영진에게 문의해 주세요.</p>
      </EmptyState>
    );
  }

  // ── 시작 후: 현황 ──────────────────────────────────────────
  const [standings, today] = await Promise.all([getStandings(event.id), getTodayRemoteMission(event.id, now)]);
  const me = standings.find((s) => s.teamId === team.id);
  const { evaluation } = state;

  return (
    <>
      <PageTitle
        title={team.name || `${team.number}조`}
        desc={`${team.number}조 · 빙고 ${evaluation.lines}줄 · ${evaluation.filled} / ${CELL_COUNT}칸 · 대면 ${evaluation.faceCount} / ${FACE_COUNT}`}
        action={
          <Link href="/ranking" className={btn.secondary}>
            랭킹 보기
          </Link>
        }
      />
      {members}

      <div className="mb-6 grid grid-cols-4 gap-2 sm:max-w-xl">
        <StatCard label="순위" value={me ? `${me.rank}위` : "-"} sub={`${standings.filter((s) => s.submitted).length}팀 중`} bg="bg-white" />
        <StatCard label="빙고" value={`${evaluation.lines}줄`} sub={`최대 ${maxLines(BOARD_SIZE)}줄`} bg="bg-mint-soft" />
        <StatCard label="채운 칸" value={`${evaluation.filled}`} sub={`/ ${CELL_COUNT}칸`} bg="bg-white" />
        <StatCard label="대면" value={`${evaluation.faceCount}`} sub={`/ ${FACE_COUNT}개`} bg="bg-pink-soft" />
      </div>

      {phase === "running" && today && !state.cells.some((c) => c.missionId === today.id) && (
        <Notice tone="gray">
          오늘의 미션 {today.number}번 &ldquo;{today.title}&rdquo;은 우리 팀 빙고판에 없어요. 대면 미션이나 다음 미션을 노려 봐요!
        </Notice>
      )}

      <BingoBoard
        n={BOARD_SIZE}
        color={team.color}
        cells={toBoardCells(state.cells, evaluation.completedLines, event, today?.id ?? null, now)}
        withCommand={phase === "running"}
      />
      <p className="mt-5 px-1 text-xs text-muted">운영진 검수로 인증이 반려되면 칸이 다시 비워질 수 있어요.</p>
    </>
  );
}
