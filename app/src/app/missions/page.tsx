import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { eventPhase, getActiveEvent, getTodayRemoteMission, isRevealed } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { formatKst } from "@/lib/time";
import type { Mission } from "@prisma/client";

export default async function MissionsPage() {
  const [user, event] = await Promise.all([getCurrentUser(), getActiveEvent()]);
  if (!event) return <EmptyState>진행 중인 시즌이 없어요.</EmptyState>;

  const now = new Date();
  const phase = eventPhase(event, now);
  const teamId = user ? await getTeamOfUser(event.id, user.id) : null;
  const [missions, today, state] = await Promise.all([
    db.mission.findMany({ where: { eventId: event.id }, orderBy: { number: "asc" } }),
    getTodayRemoteMission(event.id, now),
    teamId ? getTeamBoardState(event.id, teamId) : null,
  ]);
  const cellOf = new Map(state?.cells.map((c) => [c.missionId, c]) ?? []);

  const face = missions.filter((m) => m.type === "FACE");
  const remote = missions.filter((m) => m.type === "REMOTE");
  const pastRemote = remote.filter((m) => isRevealed(m, event, now) && m.id !== today?.id && m.publishAt && m.publishAt <= now);
  const hiddenRemote = remote.filter((m) => !isRevealed(m, event, now)).length;
  const started = phase !== "upcoming";

  function status(m: Mission) {
    if (!state || !state.team.submittedAt) return null;
    const cell = cellOf.get(m.id);
    if (!cell) return <Badge>우리 팀 빙고판에 없음</Badge>;
    if (cell.filledAt) return <Badge tone="good">인증 완료 ✓</Badge>;
    const closed = m.type === "FACE" ? now > event!.endAt : !!m.deadlineAt && m.deadlineAt < now;
    return closed ? <Badge tone="bad">놓침</Badge> : <Badge tone="sun">인증 대기</Badge>;
  }

  function item(m: Mission, highlight = false) {
    return (
      <Card key={m.id} className={highlight ? "bg-sun-soft" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex gap-3">
            <span className="font-display flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-sun text-xl">
              {m.number}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {highlight && <Badge tone="good">오늘</Badge>}
                {m.type === "REMOTE" && m.publishAt && <span className="text-xs font-bold text-muted">{formatKst(m.publishAt, false)}</span>}
                {!m.requirePhoto && <Badge tone="sky">사진 선택</Badge>}
              </div>
              <h2 className="mt-0.5 text-lg font-black">{m.title}</h2>
              {m.description && <p className="mt-0.5 text-sm text-muted">{m.description}</p>}
              <p className="mt-1 text-xs text-muted">
                {m.type === "FACE" ? `최종 마감 ${formatKst(event!.endAt)}까지` : `마감 ${formatKst(m.deadlineAt)}`}
              </p>
            </div>
          </div>
          {status(m)}
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageTitle title="미션" desc={`${event.name} · 공개된 미션만 볼 수 있어요`} />

      {!started && (
        <EmptyState>
          <p className="font-display text-2xl text-ink">시즌이 시작되면 미션이 공개돼요</p>
          <p className="mt-1">
            {formatKst(event.startAt)} 시작 · 대면 미션은 시작과 함께, 비대면 미션은 매일 오전 7시에 하나씩 공개돼요. (미션 {missions.length}개: 대면 {face.length} · 비대면 {remote.length})
          </p>
        </EmptyState>
      )}

      {started && (
        <div className="space-y-8">
          <section>
            <h2 className="font-display mb-3 text-2xl">오늘의 비대면 미션</h2>
            {today ? item(today, true) : <EmptyState>지금 공지된 비대면 미션이 없어요.</EmptyState>}
          </section>

          <section>
            <h2 className="font-display mb-1 text-2xl">대면 미션</h2>
            <p className="mb-3 text-sm text-muted">최종 마감 전까지 언제든 수행하고 인증할 수 있어요. 빙고판의 ★ 칸에만 들어가요.</p>
            <div className="space-y-3">{face.map((m) => item(m))}</div>
            {face.length === 0 && <EmptyState>등록된 대면 미션이 없어요.</EmptyState>}
          </section>

          <section>
            <h2 className="font-display mb-3 text-2xl">지난 비대면 미션</h2>
            <div className="space-y-3">{[...pastRemote].reverse().map((m) => item(m))}</div>
            {pastRemote.length === 0 && <p className="text-sm text-muted">아직 지난 미션이 없어요.</p>}
            {hiddenRemote > 0 && <p className="py-3 text-center text-sm text-muted">🔒 아직 공개되지 않은 비대면 미션이 {hiddenRemote}개 남아 있어요.</p>}
          </section>
        </div>
      )}
    </>
  );
}
