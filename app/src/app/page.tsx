import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card, EmptyState, MoreLink, Notice, Progress, StatCard, btn } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import { Countdown } from "@/components/countdown";
import { db } from "@/lib/db";
import { PHASE_LABEL, eventPhase, getActiveEvent, getNextRemoteMission, getTodayRemoteMission } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamBoardState, getTeamOfUser } from "@/lib/standings";
import { formatKst, kstDay } from "@/lib/time";
import { maxLines } from "@/lib/bingo";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";

const ERRORS: Record<string, string> = {
  oauth_not_configured: "디스코드 로그인이 아직 설정되지 않았어요. 운영진에게 문의해 주세요.",
  oauth_denied: "디스코드 로그인이 취소되었어요.",
  oauth_failed: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.",
  oauth_state: "로그인 요청이 만료되었어요. 다시 시도해 주세요.",
  not_member: "짝꽁 사업 디스코드 서버의 멤버만 참여할 수 있어요. 서버에 먼저 참여해 주세요.",
  guild_check_failed: "서버 멤버 확인에 실패했어요. 운영진에게 문의해 주세요.",
  denied: "어드민 권한이 없어요.",
};

const DAY_MS = 86400000;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; denied?: string }> }) {
  const sp = await searchParams;
  const errorKey = sp.error ?? (sp.denied ? "denied" : undefined);
  const [user, event] = await Promise.all([getCurrentUser(), getActiveEvent()]);
  const error = errorKey && ERRORS[errorKey] ? <Notice tone="bad">{ERRORS[errorKey]}</Notice> : null;

  if (!event) {
    return (
      <>
        {error}
        <EmptyState>
          <p className="text-2xl font-black tracking-[-0.04em] text-ink">곧 새로운 시즌이 열려요</p>
          <p className="mt-1">시즌 일정이 정해지면 이곳에 안내됩니다.</p>
        </EmptyState>
      </>
    );
  }

  const now = new Date();
  const phase = eventPhase(event, now);
  const [today, next, standings, myTeamId, winners, remoteMissions] = await Promise.all([
    phase === "running" ? getTodayRemoteMission(event.id, now) : null,
    phase === "running" ? getNextRemoteMission(event.id, now) : null,
    getStandings(event.id),
    user ? getTeamOfUser(event.id, user.id) : null,
    event.finalizedAt
      ? db.winner.findMany({ where: { eventId: event.id }, include: { team: true }, orderBy: { kind: "asc" } })
      : [],
    db.mission.findMany({ where: { eventId: event.id, type: "REMOTE", publishAt: { not: null } }, select: { id: true, number: true, publishAt: true } }),
  ]);
  const state = myTeamId ? await getTeamBoardState(event.id, myTeamId) : null;
  const myTeam = standings.find((s) => s.teamId === myTeamId);
  const myCells = new Map(state?.cells.map((c) => [c.missionId, c.filledAt]) ?? []);
  const todayOnBoard = today ? myCells.has(today.id) : false;
  const todayDone = today ? !!myCells.get(today.id) : false;
  const seasonDay = Math.floor((now.getTime() - event.startAt.getTime()) / DAY_MS) + 1;

  // 이번 주 인증: 오늘을 가운데 두고 앞뒤 3일
  const missionByDay = new Map(remoteMissions.map((m) => [kstDay(m.publishAt!), m]));
  const week = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const at = new Date(now.getTime() + offset * DAY_MS);
    const day = kstDay(at);
    const m = missionByDay.get(day);
    const [y, mo, d] = day.split("-").map(Number);
    const label = WEEKDAY[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
    const onBoard = m ? myCells.has(m.id) : false;
    const done = m ? !!myCells.get(m.id) : false;
    return { day, label, offset, number: m?.number, onBoard, done };
  });
  let streak = 0;
  for (const w of [...week].reverse()) {
    if (w.offset > 0 || !w.onBoard) continue;
    if (w.offset === 0 && !w.done) continue;
    if (!w.done) break;
    streak++;
  }

  const prizes = [
    { label: "1등 팀", text: event.prize1 },
    { label: "2등 팀", text: event.prize2 },
    { label: "추첨 1팀", text: event.prizeRaffle },
  ];
  const top = standings.filter((s) => s.filled > 0).slice(0, 3);
  const name = user?.name ?? "";

  let heading: ReactNode;
  let hero: ReactNode;
  if (phase === "running" && today) {
    heading = user ? `${name}님, 오늘도 한 칸 채워 볼까요?` : "오늘도 한 칸 채워 볼까요?";
    hero = (
      <>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[13px] font-bold">오늘의 미션 · No.{today.number}</span>
        <h2 className="mt-3.5 text-[2rem] font-black leading-[1.2] tracking-[-0.04em] sm:text-[2.5rem]">{today.title}</h2>
        <p className="mt-2.5 text-[15px]">
          비대면 · {today.requirePhoto ? "사진 필요" : "사진 선택"} · 마감까지{" "}
          <b>{today.deadlineAt ? <Countdown target={today.deadlineAt.toISOString()} /> : "-"}</b>
        </p>
        {today.description && <p className="mt-1 text-sm text-sub">{today.description}</p>}
      </>
    );
  } else if (phase === "running") {
    heading = user ? `${name}님, 반가워요!` : event.name;
    hero = (
      <>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[13px] font-bold">오늘의 미션</span>
        <h2 className="mt-3.5 text-[2rem] font-black leading-[1.2] tracking-[-0.04em]">지금 공지된 미션이 없어요</h2>
        <p className="mt-2.5 text-[15px]">{next ? `다음 미션은 ${formatKst(next.publishAt)}에 공개돼요.` : "대면 미션은 최종 마감 전까지 언제든 인증할 수 있어요."}</p>
      </>
    );
  } else if (phase === "upcoming") {
    heading = event.name;
    hero = (
      <>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[13px] font-bold">시즌 시작까지</span>
        <h2 className="mt-3.5 text-[2rem] font-black leading-[1.2] tracking-[-0.04em] sm:text-[2.5rem]">
          <Countdown target={event.startAt.toISOString()} />
        </h2>
        <p className="mt-2.5 text-[15px]">
          {formatKst(event.startAt)}에 빙고판이 잠겨요. 그 전에 팀원과 함께 미션 {CELL_COUNT}개를 골라 제출하세요.
        </p>
      </>
    );
  } else {
    heading = event.name;
    hero = (
      <>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[13px] font-bold">{event.finalizedAt ? "결과 확정" : PHASE_LABEL[phase]}</span>
        <h2 className="mt-3.5 text-[2rem] font-black leading-[1.2] tracking-[-0.04em]">시즌이 끝났어요. 모두 수고했어요!</h2>
        <p className="mt-2.5 text-[15px]">{event.finalizedAt ? "최종 순위와 시상 팀을 확인해 보세요." : "운영진 검수가 끝나면 결과가 확정돼요."}</p>
      </>
    );
  }

  let cta: ReactNode;
  if (!user) {
    cta = (
      <Link href="/api/auth/discord" prefetch={false} className={`${btn.primary} h-[3.25rem] px-6 text-base`}>
        디스코드로 로그인
      </Link>
    );
  } else if (phase === "ended") {
    cta = (
      <Link href="/ranking" className={`${btn.primary} h-[3.25rem] px-6 text-base`}>
        순위 보기
      </Link>
    );
  } else if (myTeam) {
    cta = (
      <Link href={phase === "running" && today && !todayOnBoard ? "/missions" : "/board"} className={`${btn.primary} h-[3.25rem] px-6 text-base`}>
        {phase === "upcoming" ? "빙고판 만들기" : todayDone ? "우리 팀 빙고 보기" : "인증하러 가기"}
      </Link>
    );
  }
  const bubble = !user
    ? "로그인하면 우리 팀 빙고판이 보여요"
    : !myTeam
      ? "아직 팀에 배정되지 않았어요"
      : phase === "running" && today
        ? todayDone
          ? "오늘 미션은 인증을 마쳤어요"
          : todayOnBoard
            ? "오늘 미션은 팀원 모두 함께해요"
            : "오늘 미션은 우리 판에 없어요"
        : "팀원과 함께 빙고를 완성해요";

  return (
    <div className="flex flex-col gap-5">
      {error}

      <div className="px-1 pt-2">
        <p className="text-sm text-muted">
          {formatKst(now, false)} · {phase === "running" ? `시즌 ${seasonDay}일째` : PHASE_LABEL[phase]}
          {myTeam && ` · ${myTeam.number}조 ${myTeam.name}`}
        </p>
        <h1 className="mt-1 text-[1.75rem] font-black leading-[1.3] tracking-[-0.04em] sm:text-[2.1rem]">{heading}</h1>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="relative flex min-h-[16.5rem] min-w-0 flex-[999_1_34rem] flex-col justify-between gap-6 overflow-hidden rounded-[2rem] bg-sky p-6 sm:p-8">
          <div className="absolute right-5 top-5 w-24 sm:right-7 sm:top-7 sm:w-[11rem]">
            <Mascot fluid />
          </div>
          <div className="relative pr-24 sm:pr-48">{hero}</div>
          <div className="relative flex flex-wrap items-center gap-2.5">
            {cta}
            <span className="inline-flex h-[3.25rem] items-center rounded-2xl bg-white/60 px-4 text-sm font-medium">{bubble}</span>
          </div>
        </section>

        <section className="card flex min-w-0 flex-[1_1_19rem] flex-col gap-3.5 p-6">
          {myTeam && myTeam.submitted ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-bold">우리 팀 빙고</h2>
                <MoreLink href="/board">판 보기</MoreLink>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black leading-none tracking-[-0.04em]">{myTeam.filled}</span>
                <span className="text-muted">/ {CELL_COUNT}칸</span>
              </div>
              <Progress value={myTeam.filled} max={CELL_COUNT} />
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="순위" value={`${myTeam.rank}위`} />
                <StatCard label="빙고" value={`${myTeam.lines}줄`} bg="bg-sky-soft" />
                <StatCard label="대면" value={`${myTeam.faceCount} / ${FACE_COUNT}`} bg="bg-cocoa-soft" />
              </div>
            </>
          ) : myTeam ? (
            <>
              <h2 className="text-[17px] font-bold">우리 팀 빙고</h2>
              <p className="text-2xl font-black tracking-[-0.03em]">
                {myTeam.number}조 {myTeam.name || "(팀명 미정)"}
              </p>
              <p className="text-sm text-sub">
                {phase === "upcoming" ? "아직 빙고판을 제출하지 않았어요. 시즌이 시작되면 판이 잠기니 그 전에 제출해 주세요." : "시즌 전에 빙고판을 제출하지 않아 이번 시즌에는 참여할 수 없어요."}
              </p>
              {phase === "upcoming" && (
                <Link href="/board" className={`${btn.secondary} mt-auto`}>
                  빙고판 만들러 가기
                </Link>
              )}
            </>
          ) : (
            <>
              <h2 className="text-[17px] font-bold">{event.name}</h2>
              <p className="text-sm text-sub">
                {formatKst(event.startAt)} ~ {formatKst(event.endAt)}
                <br />
                {BOARD_SIZE}×{BOARD_SIZE} 팀 빙고 · 팀원 2~4명
              </p>
              <p className="text-sm text-sub">{user ? "운영진이 팀을 편성하면 이곳에 우리 팀이 보여요." : "로그인하면 우리 팀과 빙고판을 볼 수 있어요."}</p>
              <Link href="/how-to" className={`${btn.secondary} mt-auto`}>
                이용 방법 보기
              </Link>
            </>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        {myTeam?.submitted && phase !== "upcoming" && (
          <Card className="min-w-0 flex-[1_1_26rem]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold">이번 주 인증</h2>
              {streak >= 2 && <span className="rounded-full bg-sky-soft px-2.5 py-1 text-[13px] font-bold">{streak}일 연속 성공</span>}
            </div>
            <ol className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
              {week.map((w) => {
                const tone = w.done
                  ? "bg-sky"
                  : w.offset === 0 && w.number
                    ? "bg-white shadow-[inset_0_0_0_2.5px_var(--ink)]"
                    : "bg-well text-[#b5aba5]";
                return (
                  <li key={w.day} className="flex flex-col items-center gap-2">
                    <span
                      className={`inline-flex size-10 items-center justify-center rounded-full text-sm font-black sm:size-11 ${tone}`}
                      title={w.number ? `${w.number}번${w.onBoard ? "" : " (우리 판에 없음)"}` : "미션 없음"}
                    >
                      {w.done ? "✓" : w.offset === 0 && w.number ? w.number : w.offset < 0 && w.onBoard ? "·" : ""}
                    </span>
                    <span className={`text-xs ${w.offset === 0 ? "font-bold text-ink" : "text-muted"}`}>{w.offset === 0 ? "오늘" : w.label}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        <Card className="min-w-0 flex-[1_1_26rem]">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">{winners.length ? "최종 결과" : "지금 순위"}</h2>
            <MoreLink href="/ranking">전체 보기</MoreLink>
          </div>
          {winners.length > 0 ? (
            <ol className="mt-3 flex flex-col gap-1.5">
              {winners.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-2xl bg-well px-3 py-2.5">
                  <Badge tone={w.kind === "RAFFLE" ? "sky" : "ink"}>{w.kind === "FIRST" ? "1등" : w.kind === "SECOND" ? "2등" : "추첨"}</Badge>
                  <span className="flex-1 truncate font-bold">
                    {w.team.number}조 {w.team.name}
                  </span>
                  <span className="text-[13px] text-sub">
                    {w.lines}줄 · {w.filled}칸
                  </span>
                </li>
              ))}
            </ol>
          ) : top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">아직 빙고를 채운 팀이 없어요.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-1.5">
              {top.map((t) => (
                <li key={t.teamId}>
                  <Link
                    href={`/teams/${t.teamId}`}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-sky-soft ${t.teamId === myTeamId ? "bg-sky-soft" : "bg-well"}`}
                  >
                    <span className={`w-5 text-center text-lg font-black ${t.rank <= 2 ? "" : "text-muted"}`}>{t.rank}</span>
                    <span className="flex-1 truncate font-bold">
                      {t.number}조 {t.name}
                    </span>
                    <span className="text-[13px] text-sub">
                      {t.lines}/{maxLines(BOARD_SIZE)}줄 · {t.filled}칸
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold">시상</h2>
          <p className="text-[13px] text-muted">빙고 줄 → 채운 칸 → 대면 미션 수 순서</p>
        </div>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {prizes.map((p, i) => (
            <li key={p.label} className={`rounded-[1.3rem] p-4 ${i === 2 ? "bg-cocoa-soft" : "bg-sky-soft"}`}>
              <p className="text-xs font-bold text-sub">{p.label}</p>
              <p className="mt-1 font-black">{p.text || "상품 준비 중"}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">1·2등을 제외한 팀 중 1팀은 채운 칸 수만큼 추첨권을 받아 추첨해요.</p>
      </Card>
    </div>
  );
}
