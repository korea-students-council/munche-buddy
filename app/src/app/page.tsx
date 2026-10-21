import Link from "next/link";
import { Badge, Card, EmptyState, Notice, btn } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import { db } from "@/lib/db";
import { PHASE_LABEL, eventPhase, getActiveEvent, getNextRemoteMission, getTodayRemoteMission } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamOfUser } from "@/lib/standings";
import { formatKst, remaining } from "@/lib/time";
import { maxLines } from "@/lib/bingo";
import { BOARD_SIZE } from "@/lib/rules";

const ERRORS: Record<string, string> = {
  oauth_not_configured: "디스코드 로그인이 아직 설정되지 않았어요. 운영진에게 문의해 주세요.",
  oauth_denied: "디스코드 로그인이 취소되었어요.",
  oauth_failed: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
  oauth_state: "로그인 요청이 만료되었어요. 다시 시도해 주세요.",
  not_member: "짝꽁 사업 디스코드 서버의 멤버만 참여할 수 있어요. 서버에 먼저 참여해 주세요.",
  guild_check_failed: "서버 멤버 확인에 실패했어요. 운영진에게 문의해 주세요.",
  denied: "어드민 권한이 없어요.",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; denied?: string }> }) {
  const sp = await searchParams;
  const errorKey = sp.error ?? (sp.denied ? "denied" : undefined);
  const [user, event] = await Promise.all([getCurrentUser(), getActiveEvent()]);

  if (!event) {
    return (
      <>
        {errorKey && ERRORS[errorKey] && <Notice tone="bad">{ERRORS[errorKey]}</Notice>}
        <EmptyState>
          <p className="font-display text-2xl text-ink">곧 새로운 시즌이 열려요</p>
          <p className="mt-1">시즌 일정이 정해지면 이곳에 안내됩니다.</p>
        </EmptyState>
      </>
    );
  }

  const now = new Date();
  const phase = eventPhase(event, now);
  const [today, next, standings, myTeamId, winners] = await Promise.all([
    phase === "running" ? getTodayRemoteMission(event.id, now) : null,
    phase === "running" ? getNextRemoteMission(event.id, now) : null,
    getStandings(event.id),
    user ? getTeamOfUser(event.id, user.id) : null,
    event.finalizedAt
      ? db.winner.findMany({ where: { eventId: event.id }, include: { team: true }, orderBy: { kind: "asc" } })
      : [],
  ]);
  const myTeam = standings.find((s) => s.teamId === myTeamId);

  const prizes = [
    { icon: "🥇", label: "1등 팀", text: event.prize1 },
    { icon: "🥈", label: "2등 팀", text: event.prize2 },
    { icon: "🎁", label: "추첨 1팀", text: event.prizeRaffle },
  ];
  const top = standings.filter((s) => s.filled > 0).slice(0, 3);

  return (
    <div className="space-y-6">
      {errorKey && ERRORS[errorKey] && <Notice tone="bad">{ERRORS[errorKey]}</Notice>}

      <section className="card relative overflow-hidden bg-mint-soft p-6 sm:p-8">
        <div className="flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={phase === "running" ? "good" : phase === "upcoming" ? "sun" : "gray"}>{PHASE_LABEL[phase]}</Badge>
              {event.finalizedAt && <Badge tone="pink">결과 확정</Badge>}
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{event.name}</h1>
            <p className="mt-2 text-sm font-bold text-muted">
              {formatKst(event.startAt)} ~ {formatKst(event.endAt)} · {BOARD_SIZE}×{BOARD_SIZE} 팀 빙고
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {!user ? (
                <Link href="/api/auth/discord" prefetch={false} className={btn.primary}>
                  디스코드로 로그인
                </Link>
              ) : myTeam ? (
                <Link href="/board" className={btn.primary}>
                  우리 팀 빙고 보기
                </Link>
              ) : (
                <span className="rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold">아직 팀에 배정되지 않았어요</span>
              )}
              <Link href="/how-to" className={btn.secondary}>
                이용 방법
              </Link>
            </div>
          </div>
          <Mascot size={150} className="bob shrink-0 self-center" />
        </div>
      </section>

      {myTeam && (
        <Card className="bg-sun-soft">
          <p className="text-xs font-black text-muted">우리 팀</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-black">
            <span className="font-display text-2xl">
              {myTeam.number}조 {myTeam.name}
            </span>
            {myTeam.submitted ? (
              <span className="text-sm font-bold text-muted">
                현재 {myTeam.rank}위 · 빙고 {myTeam.lines}/{maxLines(BOARD_SIZE)}줄 · {myTeam.filled}칸
              </span>
            ) : (
              <Badge tone="pink">빙고판을 아직 제출하지 않았어요</Badge>
            )}
          </p>
        </Card>
      )}

      {phase === "upcoming" && (
        <Card>
          <h2 className="font-display text-2xl">시작까지 {remaining(event.startAt, now)}</h2>
          <p className="mt-1 text-sm text-muted">
            {formatKst(event.startAt)}에 빙고판이 잠겨요. 그 전에 팀원들과 함께 미션 {BOARD_SIZE * BOARD_SIZE}개를 골라 팀명과 색을 정해 제출하세요.
          </p>
        </Card>
      )}

      {phase === "running" && (
        <Card>
          <h2 className="text-sm font-black text-muted">오늘의 비대면 미션</h2>
          {today ? (
            <>
              <p className="mt-2 text-2xl font-black">
                <span className="font-display mr-2 rounded-xl border-2 border-ink bg-sun px-2.5 text-3xl">{today.number}</span>
                {today.title}
              </p>
              {today.description && <p className="mt-2 text-sm text-muted">{today.description}</p>}
              <p className="mt-3 text-sm font-bold">
                ⏰ {formatKst(today.deadlineAt)}까지 · {remaining(today.deadlineAt ?? now, now)} 남음
              </p>
              <p className="mt-2 rounded-xl bg-sky-soft px-3 py-2 text-xs font-bold">
                디스코드 인증 채널에서 <code className="rounded bg-white px-1">/인증 번호:{today.number}</code>
                {today.requirePhoto ? " + 사진 첨부" : " (사진은 선택)"} · 팀원 모두가 참여해야 인정돼요
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              지금 공지된 비대면 미션이 없어요.
              {next && ` 다음 미션은 ${formatKst(next.publishAt)}에 공개돼요.`}
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-display mb-3 text-2xl">🏆 시상</h2>
          <ul className="space-y-2.5 text-sm">
            {prizes.map((p) => (
              <li key={p.label} className="flex items-start gap-3">
                <span className="text-2xl leading-none">{p.icon}</span>
                <span>
                  <span className="block text-xs font-bold text-muted">{p.label}</span>
                  <span className="font-bold">{p.text || "상품 준비 중"}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            1·2등은 빙고 줄 → 채운 칸 → 대면 미션 수 순서로 정해요. 나머지 팀 중 1팀은 채운 칸만큼 쪽지를 받아 추첨해요.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">{winners.length ? "결과" : "현재 TOP 3"}</h2>
            <Link href="/ranking" className="text-xs font-bold underline underline-offset-2">
              전체 보기 →
            </Link>
          </div>
          {winners.length > 0 ? (
            <ol className="space-y-2">
              {winners.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-sun-soft px-3 py-2">
                  <span className="text-xl">{w.kind === "FIRST" ? "🥇" : w.kind === "SECOND" ? "🥈" : "🎁"}</span>
                  <span className="flex-1 truncate text-sm font-bold">
                    {w.team.number}조 {w.team.name}
                  </span>
                  <span className="text-xs font-bold text-muted">{w.lines}줄 · {w.filled}칸</span>
                </li>
              ))}
            </ol>
          ) : top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">아직 빙고를 채운 팀이 없어요.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((t) => (
                <li key={t.teamId}>
                  <Link href={`/teams/${t.teamId}`} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-3 py-2 hover:bg-sun-soft">
                  <span className="font-display w-6 text-center text-xl">{t.rank}</span>
                  <span className="flex-1 truncate text-sm font-bold">
                    {t.number}조 {t.name}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {t.lines}/{maxLines(BOARD_SIZE)}줄 · {t.filled}칸
                  </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
