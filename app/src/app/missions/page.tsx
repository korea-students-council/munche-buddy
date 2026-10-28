import { Badge, EmptyState, PageTitle } from "@/components/ui";
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
    if (!cell) return <Badge>우리 판에 없음</Badge>;
    if (cell.filledAt) return <Badge tone="sun">인증 완료 ✓</Badge>;
    const closed = m.type === "FACE" ? now > event!.endAt : !!m.deadlineAt && m.deadlineAt < now;
    return closed ? <Badge tone="bad">놓침</Badge> : <Badge tone="ink">인증 대기</Badge>;
  }

  function item(m: Mission, highlight = false) {
    const done = !!cellOf.get(m.id)?.filledAt;
    return (
      <li key={m.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-[1.5rem] p-4 sm:p-5 ${highlight ? "bg-sky" : "bg-white"}`}>
        <div className="flex min-w-0 gap-3.5">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-[1.1rem] text-xl font-black ${
              highlight ? "bg-white" : done ? "bg-sky" : m.type === "FACE" ? "bg-cocoa-soft" : "bg-well"
            }`}
          >
            {m.number}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {highlight && <span className="rounded-full bg-ink px-2.5 py-0.5 font-bold text-white">오늘</span>}
              {m.type === "REMOTE" && m.publishAt && <span className="font-bold text-sub">{formatKst(m.publishAt, false)}</span>}
              {!m.requirePhoto && <span className="rounded-full bg-sky-soft px-2 py-0.5 font-bold">사진 선택</span>}
            </div>
            <h3 className="mt-0.5 text-[17px] font-black tracking-[-0.02em]">{m.title}</h3>
            {m.description && <p className="mt-0.5 text-sm text-sub">{m.description}</p>}
            <p className="mt-1 text-xs text-muted">
              {m.type === "FACE" ? `최종 마감 ${formatKst(event!.endAt)}까지` : `마감 ${formatKst(m.deadlineAt)}`}
              {` · /인증 번호:${m.number}`}
            </p>
          </div>
        </div>
        {status(m)}
      </li>
    );
  }

  return (
    <>
      <PageTitle title="미션" desc={`${event.name} · 공개된 미션만 볼 수 있어요`} />

      {!started && (
        <EmptyState>
          <p className="text-2xl font-black tracking-[-0.04em] text-ink">시즌이 시작되면 미션이 공개돼요</p>
          <p className="mt-1">
            {formatKst(event.startAt)} 시작 · 대면 미션은 시작과 함께, 비대면 미션은 매일 오전 7시에 하나씩 공개돼요. (미션 {missions.length}개: 대면 {face.length} · 비대면 {remote.length})
          </p>
        </EmptyState>
      )}

      {started && (
        <div className="space-y-9">
          <section>
            <h2 className="mb-3 px-1 text-xl font-black tracking-[-0.03em]">오늘의 비대면 미션</h2>
            {today ? (
              <ul>{item(today, true)}</ul>
            ) : (
              <p className="card px-5 py-8 text-center text-sm text-muted">지금 공지된 비대면 미션이 없어요.</p>
            )}
          </section>

          <section>
            <h2 className="px-1 text-xl font-black tracking-[-0.03em]">대면 미션</h2>
            <p className="mb-3 mt-0.5 px-1 text-sm text-sub">최종 마감 전까지 언제든 팀원이 모두 만나서 수행하고 인증해요. 빙고판의 대면 칸에만 들어가요.</p>
            <ul className="space-y-2">{face.map((m) => item(m))}</ul>
            {face.length === 0 && <p className="card px-5 py-8 text-center text-sm text-muted">등록된 대면 미션이 없어요.</p>}
          </section>

          <section>
            <h2 className="mb-3 px-1 text-xl font-black tracking-[-0.03em]">지난 비대면 미션</h2>
            <ul className="space-y-2">{[...pastRemote].reverse().map((m) => item(m))}</ul>
            {pastRemote.length === 0 && <p className="px-1 text-sm text-muted">아직 지난 미션이 없어요.</p>}
            {hiddenRemote > 0 && (
              <p className="mt-3 rounded-[1.3rem] bg-well px-4 py-3 text-center text-sm text-sub">
                아직 공개되지 않은 비대면 미션이 {hiddenRemote}개 남아 있어요. 매일 오전 7시에 하나씩 열려요.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
