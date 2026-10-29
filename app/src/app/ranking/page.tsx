import Link from "next/link";
import { Badge, Card, EmptyState, Notice, PageTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamOfUser } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";
import { formatKst } from "@/lib/time";

const KIND_LABEL = { FIRST: "1등", SECOND: "2등", RAFFLE: "추첨" } as const;

export default async function RankingPage() {
  const [user, event] = await Promise.all([getCurrentUser(), getActiveEvent()]);
  if (!event) return <EmptyState>진행 중인 시즌이 없어요.</EmptyState>;

  const [standings, winners, myTeamId] = await Promise.all([
    getStandings(event.id),
    event.finalizedAt ? db.winner.findMany({ where: { eventId: event.id } }) : [],
    user ? getTeamOfUser(event.id, user.id) : null,
  ]);
  const winnerKind = new Map(winners.map((w) => [w.teamId, w.kind]));
  const submitted = standings.filter((s) => s.submitted);

  return (
    <>
      <PageTitle title="랭킹" desc={event.name} />
      {event.finalizedAt && <Notice tone="sun">{formatKst(event.finalizedAt)}에 최종 결과가 확정되었어요.</Notice>}

      <div className="flex flex-wrap items-start gap-6">
        <section className="min-w-0 flex-[999_1_34rem]">
          {submitted.length === 0 ? (
            <EmptyState>아직 빙고판을 제출한 팀이 없어요.</EmptyState>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {submitted.map((s, i) => {
                const mine = s.teamId === myTeamId;
                const kind = winnerKind.get(s.teamId);
                return (
                  <li key={s.teamId}>
                    <Link
                      href={`/teams/${s.teamId}`}
                      className={`flex items-center gap-3.5 rounded-[1.5rem] px-4 py-4 transition-colors sm:px-5 ${mine ? "bg-mint-soft" : "bg-white hover:bg-well"}`}
                    >
                      <span className={`w-6 shrink-0 text-center text-lg font-black ${s.rank <= 2 && s.filled > 0 ? "text-mint-deep" : "text-[#7c8a84]"}`}>{s.rank}</span>
                      <span
                        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl font-black ${mine ? "bg-white text-mint-deep" : i % 2 === 0 ? "bg-mint-soft text-mint-deep" : "bg-pink-soft text-pink-deep"}`}
                        aria-hidden="true"
                      >
                        {(s.name || `${s.number}`).slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-base font-bold">
                              {s.number}조 {s.name}
                            </span>
                            {mine && <span className="shrink-0 whitespace-nowrap"><Badge tone="ink">우리 팀</Badge></span>}
                            {kind && <span className="shrink-0 whitespace-nowrap"><Badge tone={kind === "RAFFLE" ? "sun" : "ink"}>{KIND_LABEL[kind]}</Badge></span>}
                          </span>
                          <span className="shrink-0 text-[13px] text-sub">
                            {s.lines}줄 · {s.filled}칸 · 대면 {s.faceCount}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#eef3f0]">
                          <div className={`h-full rounded-full ${mine ? "bg-[#4fb37e]" : "bg-mint-mid"}`} style={{ width: `${Math.round((s.filled / CELL_COUNT) * 100)}%` }} />
                        </div>
                        <p className="mt-1.5 truncate text-xs text-muted">{s.members.join(" · ")}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <Card className="min-w-0 flex-[1_1_19rem]">
          <h2 className="text-[17px] font-bold">순위는 이렇게 정해져요</h2>
          <ol className="mt-3.5 flex list-decimal flex-col gap-2 pl-5 text-sub">
            <li>완성한 빙고 줄 수 (최대 {maxLines(BOARD_SIZE)}줄)</li>
            <li>같으면 채운 칸 수 ({CELL_COUNT}칸 중)</li>
            <li>그래도 같으면 대면 미션 수 ({FACE_COUNT}개 중)</li>
          </ol>
          <p className="mt-4 rounded-[1.2rem] bg-sun-soft p-4 text-sm">
            1·2위 외 팀 중 한 팀은 <b>채운 칸 수만큼 추첨권</b>을 받아 추첨해요.
          </p>
          <p className="mt-3 text-xs text-muted">운영진 검수로 인증이 반려되면 순위가 바뀔 수 있어요. 확정 전 순위는 잠정이에요. 팀을 누르면 그 팀의 빙고판을 볼 수 있어요.</p>
        </Card>
      </div>
    </>
  );
}
