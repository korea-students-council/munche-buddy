import Link from "next/link";
import { Badge, Card, EmptyState, PageTitle, btn } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { DEMO_EVENT_NAME } from "@/lib/demo";
import { deleteDemo, loadDemo } from "./actions";
import { db } from "@/lib/db";
import { PHASE_LABEL, eventPhase, getActiveEvent, getTodayRemoteMission } from "@/lib/event";
import { getStandings } from "@/lib/standings";
import { FACE_COUNT, REMOTE_COUNT, TEAM_MAX, TEAM_MIN, TYPE_LABEL } from "@/lib/rules";
import { formatDay, formatKst } from "@/lib/time";

// 데모 시즌 넣기는 쿼리가 많아서 넉넉히 기다린다
export const maxDuration = 60;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const event = await getActiveEvent();
  if (!event) {
    return (
      <>
        <Flash ok={sp.ok} error={sp.error} />
        <EmptyState href="/admin/event?new=1" cta="시즌 만들기">
          아직 활성화된 시즌이 없어요. 먼저 시즌을 만들어 주세요.
        </EmptyState>
        <Card className="mt-4">
          <h2 className="font-black">데모 시즌으로 둘러보기</h2>
          <p className="mt-1 text-sm text-muted">
            가짜 팀 6개, 미션, 인증 기록이 들어간 시즌을 만들어요. 나는 1조에 들어가요. 디스코드에는 공지되지 않고, 나중에 한 번에 지울 수 있어요.
          </p>
          <form action={loadDemo} className="mt-3">
            <button className={btn.primary}>데모 시즌 넣기</button>
          </form>
        </Card>
      </>
    );
  }
  const isDemo = event.name === DEMO_EVENT_NAME;

  const now = new Date();
  const phase = eventPhase(event, now);
  const [standings, accepted, rejected, missions, cellCounts, doneRows, recent, today] = await Promise.all([
    getStandings(event.id),
    db.submission.count({ where: { eventId: event.id, status: "ACCEPTED" } }),
    db.submission.count({ where: { eventId: event.id, status: "REJECTED" } }),
    db.mission.findMany({ where: { eventId: event.id }, orderBy: { number: "asc" } }),
    db.teamCell.groupBy({ by: ["missionId"], where: { team: { eventId: event.id } }, _count: true }),
    db.submission.groupBy({ by: ["missionId", "teamId"], where: { eventId: event.id, status: "ACCEPTED" } }),
    db.submission.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { team: true, mission: true, user: true },
    }),
    getTodayRemoteMission(event.id, now),
  ]);

  const holders = new Map(cellCounts.map((c) => [c.missionId, c._count]));
  const doneTeams = new Map<string, number>();
  doneRows.forEach((r) => doneTeams.set(r.missionId, (doneTeams.get(r.missionId) ?? 0) + 1));

  const face = missions.filter((m) => m.type === "FACE");
  const remote = missions.filter((m) => m.type === "REMOTE");
  const unscheduled = remote.filter((m) => !m.publishAt).length;
  const outside = remote.filter((m) => m.publishAt && m.deadlineAt && (m.publishAt < event.startAt || m.deadlineAt > event.endAt)).length;
  const submitted = standings.filter((s) => s.submitted).length;
  const badSize = standings.filter((s) => s.members.length < TEAM_MIN || s.members.length > TEAM_MAX).length;

  const warnings: string[] = [];
  if (face.length < FACE_COUNT) warnings.push(`대면 미션이 부족해요 (${face.length}/${FACE_COUNT}개 이상 필요).`);
  if (remote.length < REMOTE_COUNT) warnings.push(`비대면 미션이 부족해요 (${remote.length}/${REMOTE_COUNT}개 이상 필요).`);
  if (unscheduled > 0) warnings.push(`${unscheduled}개의 비대면 미션에 공지 일정이 없어요.`);
  if (outside > 0) warnings.push(`${outside}개의 비대면 미션 일정이 시즌 기간을 벗어나요.`);
  if (standings.length === 0) warnings.push("편성된 팀이 없어요. 팀 관리에서 팀을 만들어 주세요.");
  if (badSize > 0) warnings.push(`${badSize}개 팀의 인원이 ${TEAM_MIN}~${TEAM_MAX}명이 아니에요.`);
  if (phase === "upcoming" && submitted < standings.length) warnings.push(`아직 빙고판을 제출하지 않은 팀이 ${standings.length - submitted}팀 있어요.`);
  if (!event.verifyChannelId || !event.announceChannelId) warnings.push("디스코드 채널 ID가 설정되지 않았어요. (시즌 설정)");

  return (
    <>
      <PageTitle
        title="대시보드"
        desc={`${event.name} · ${formatKst(event.startAt)} ~ ${formatKst(event.endAt)}`}
        action={<Badge tone={phase === "running" ? "good" : phase === "upcoming" ? "sun" : "gray"}>{PHASE_LABEL[phase]}</Badge>}
      />

      <Flash ok={sp.ok} error={sp.error} />
      {isDemo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sun-soft px-4 py-3 text-sm">
          <p>
            <b>데모 시즌이에요.</b> 실제 시즌을 만들기 전에 지워 주세요.
          </p>
          <div className="flex gap-2">
            <form action={loadDemo}>
              <button className={btn.secondary}>날짜에 맞춰 다시 넣기</button>
            </form>
            <form action={deleteDemo}>
              <ConfirmButton message="데모 시즌과 데모 사용자를 모두 지울까요?" className={btn.danger}>
                데모 지우기
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mb-4 rounded-2xl border-2 border-bad/60 bg-bad-soft px-4 py-3 text-sm text-bad">
          <p className="font-black">확인이 필요해요</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="팀 (빙고판 제출)" value={`${standings.length} (${submitted})`} />
        <Stat label="인정된 인증" value={accepted} />
        <Stat label="반려된 인증" value={rejected} />
        <Stat label="대면 / 비대면 미션" value={`${face.length} / ${remote.length}`} />
      </div>

      <Card className="mb-6">
        <h2 className="text-sm font-black text-muted">오늘의 비대면 미션</h2>
        {today ? (
          <p className="mt-1 text-lg font-black">
            {today.number}번 {today.title}{" "}
            <span className="text-sm font-medium text-muted">
              · 마감 {formatKst(today.deadlineAt)} · 달성 {doneTeams.get(today.id) ?? 0}/{holders.get(today.id) ?? 0}팀
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">지금 공지된 비대면 미션이 없어요.</p>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">미션별 달성 현황</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1.5 text-left">번호</th>
                  <th className="py-1.5 text-left">미션</th>
                  <th className="py-1.5 text-left">날짜</th>
                  <th className="py-1.5 text-right">보유</th>
                  <th className="py-1.5 text-right">달성</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-bold">{m.number}</td>
                    <td className="py-1.5 font-medium">
                      {m.type === "FACE" && <span className="mr-1 text-xs">★</span>}
                      {m.title}
                    </td>
                    <td className="py-1.5 pr-2 text-xs text-muted">{m.type === "FACE" ? TYPE_LABEL.FACE : m.day ? formatDay(m.day) : "미정"}</td>
                    <td className="py-1.5 text-right text-muted">{holders.get(m.id) ?? 0}</td>
                    <td className="py-1.5 text-right font-bold">{doneTeams.get(m.id) ?? 0}</td>
                  </tr>
                ))}
                {missions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted">
                      등록된 미션이 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">최근 인증</h2>
            <Link href="/admin/submissions" className="text-xs font-bold underline underline-offset-2">
              전체 보기 →
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <b>
                    {s.team.number}조 {s.team.name}
                  </b>{" "}
                  · {s.mission.number}번 {s.mission.title}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  {formatKst(s.postedAt)}
                  <Badge tone={s.status === "ACCEPTED" ? "good" : "bad"}>{s.status === "ACCEPTED" ? "인정" : "반려"}</Badge>
                </span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-6 text-center text-muted">아직 인증이 없어요.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="font-display mt-1 text-3xl">{value}</p>
    </div>
  );
}
