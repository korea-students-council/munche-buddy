import { Avatar, Badge, BingoGrid, Card, EmptyState, Notice, PageTitle, btn } from "@/components/ui";
import Link from "next/link";
import { db } from "@/lib/db";
import { eventPhase, getActiveEvent, getTodayRemoteMission } from "@/lib/event";
import { requireUser } from "@/lib/session";
import { getStandings, getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { allLines, maxLines } from "@/lib/bingo";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT, REMOTE_COUNT, TYPE_LABEL } from "@/lib/rules";
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
        <p className="font-display text-xl text-ink">아직 팀에 배정되지 않았어요</p>
        <p className="mt-1">운영진이 팀을 편성하면 우리 팀 빙고판이 열려요. 편성이 끝났는데도 보이지 않으면 운영진에게 문의해 주세요.</p>
      </EmptyState>
    );
  }
  const state = await getTeamBoardState(event.id, teamId);
  if (!state) return <EmptyState>팀 정보를 찾을 수 없어요.</EmptyState>;
  const { team } = state;
  const submitted = team.submittedAt !== null;

  const header = (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Badge tone="sun">{team.number}조</Badge>
      {team.name && <span className="font-display text-xl">{team.name}</span>}
      <span className="flex items-center gap-1">
        {team.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-white py-0.5 pl-0.5 pr-2 text-xs font-bold">
            <Avatar name={m.user.name} src={m.user.avatar} size={20} />
            {m.user.name}
          </span>
        ))}
      </span>
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
          desc={`${formatKst(event.startAt)}에 시작하면 판이 잠겨요 (${remaining(event.startAt, now)} 남음). 팀원 누구나 함께 수정할 수 있고, 마지막에 저장한 내용이 적용돼요.`}
        />
        {header}
        {faceN < FACE_COUNT || remoteN < REMOTE_COUNT ? (
          <Notice tone="bad">
            미션이 아직 부족해요. 대면 {faceN}/{FACE_COUNT}개 이상, 비대면 {remoteN}/{REMOTE_COUNT}개 이상이 필요해요. 운영진이 미션을 더 등록하면 만들 수 있어요.
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
        <p className="font-display text-xl text-ink">이번 시즌은 참여할 수 없어요</p>
        <p className="mt-1">시즌이 시작되기 전에 빙고판을 제출한 팀만 참여할 수 있어요. 궁금한 점은 운영진에게 문의해 주세요.</p>
      </EmptyState>
    );
  }

  // ── 시작 후: 현황 ──────────────────────────────────────────
  const [standings, today] = await Promise.all([getStandings(event.id), getTodayRemoteMission(event.id, now)]);
  const me = standings.find((s) => s.teamId === team.id);
  const lines = allLines(BOARD_SIZE);
  const lineCells = new Set<number>();
  state.evaluation.completedLines.forEach((i) => lines[i].forEach((p) => lineCells.add(p)));
  const todayCell = today ? state.cells.find((c) => c.missionId === today.id) : undefined;

  return (
    <>
      <PageTitle
        title="우리 팀 빙고"
        desc={event.name}
        action={
          <Link href="/ranking" className={btn.secondary}>
            랭킹 보기
          </Link>
        }
      />
      {header}

      <div className="mb-5 grid grid-cols-4 gap-1.5 sm:gap-3">
        <Stat label="현재 순위" value={me ? `${me.rank}위` : "-"} sub={`${standings.length}팀 중`} bg="bg-sun-soft" />
        <Stat label="빙고 줄" value={`${state.evaluation.lines}`} sub={`최대 ${maxLines(BOARD_SIZE)}줄`} bg="bg-mint-soft" />
        <Stat label="채운 칸" value={`${state.evaluation.filled}`} sub={`/ ${CELL_COUNT}칸`} bg="bg-pink-soft" />
        <Stat label="대면 미션" value={`${state.evaluation.faceCount}`} sub={`/ ${FACE_COUNT}개`} bg="bg-sky-soft" />
      </div>

      {phase === "running" && (
        <Card className="mb-6">
          <h2 className="text-sm font-black text-muted">오늘의 비대면 미션</h2>
          {today ? (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-black">
                <span className="font-display mr-1 text-2xl">{today.number}</span>
                {today.title}
              </p>
              {todayCell ? (
                todayCell.filledAt ? (
                  <Badge tone="good">인증 완료 ✓</Badge>
                ) : (
                  <Badge tone="sun">
                    우리 팀 빙고판에 있어요 · {remaining(today.deadlineAt ?? now, now)} 남음
                  </Badge>
                )
              ) : (
                <Badge>우리 팀 빙고판에는 없는 미션</Badge>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">지금 공지된 비대면 미션이 없어요.</p>
          )}
          <p className="mt-3 rounded-xl bg-sky-soft px-3 py-2 text-xs font-bold">
            디스코드 인증 채널에서 <code className="rounded bg-white px-1">/인증 번호:{today?.number ?? "미션번호"}</code> + 사진 첨부
          </p>
        </Card>
      )}

      <BingoGrid
        n={BOARD_SIZE}
        color={team.color}
        cells={state.cells.map((c) => ({
          position: c.position,
          number: c.mission.number,
          title: c.mission.title,
          filled: c.filledAt !== null,
          inLine: lineCells.has(c.position),
          face: c.mission.type === "FACE",
        }))}
      />
      <p className="mt-4 text-center text-xs text-muted">
        ★ 칸은 {TYPE_LABEL.FACE} 미션 칸이에요. 운영진 검수로 인증이 반려되면 칸이 다시 비워질 수 있어요.
      </p>
    </>
  );
}

function Stat({ label, value, sub, bg }: { label: string; value: string; sub: string; bg: string }) {
  return (
    <div className={`card px-1 py-2 text-center sm:p-4 ${bg}`}>
      <p className="text-[10px] font-bold text-muted sm:text-xs">{label}</p>
      <p className="font-display text-xl leading-tight sm:mt-0.5 sm:text-3xl">{value}</p>
      <p className="text-[10px] text-muted sm:text-xs">{sub}</p>
    </div>
  );
}
