import { Badge, EmptyState, Notice, PageTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings, getTeamOfUser } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";
import { formatKst } from "@/lib/time";

const MEDAL = ["🥇", "🥈"];

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
      <PageTitle title="랭킹" desc={`${event.name} · 빙고 줄 → 채운 칸 → 대면 미션 수 순서`} />
      {event.finalizedAt && <Notice tone="good">🎉 {formatKst(event.finalizedAt)}에 최종 결과가 확정되었어요.</Notice>}

      {submitted.length === 0 ? (
        <EmptyState>아직 빙고판을 제출한 팀이 없어요.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-b-2 border-ink bg-sun-soft text-xs">
                <tr>
                  <th className="w-14 px-3 py-3 text-center">순위</th>
                  <th className="px-3 py-3 text-left">팀</th>
                  <th className="px-3 py-3 text-right">빙고 줄</th>
                  <th className="px-3 py-3 text-right">채운 칸</th>
                  <th className="px-3 py-3 text-right">대면</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((s) => {
                  const mine = s.teamId === myTeamId;
                  const kind = winnerKind.get(s.teamId);
                  const medal = event.finalizedAt
                    ? kind === "FIRST" ? "🥇" : kind === "SECOND" ? "🥈" : kind === "RAFFLE" ? "🎁" : null
                    : s.filled > 0 && s.rank <= 2 ? MEDAL[s.rank - 1] : null;
                  return (
                    <tr key={s.teamId} className={`border-t border-line ${mine ? "bg-mint-soft" : ""}`}>
                      <td className="font-display px-3 py-3 text-center text-lg">{medal ?? s.rank}</td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <b>
                            {s.number}조 {s.name}
                          </b>
                          {mine && <Badge tone="sun">우리 팀</Badge>}
                        </span>
                        <span className="block text-xs text-muted">{s.members.join(" · ")}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-black">
                        {s.lines}
                        <span className="font-medium text-muted"> / {maxLines(BOARD_SIZE)}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-muted">
                        {s.filled} / {CELL_COUNT}
                      </td>
                      <td className="px-3 py-3 text-right text-muted">
                        {s.faceCount} / {FACE_COUNT}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        운영진 검수로 인증이 반려되면 순위가 바뀔 수 있어요. 확정 전 순위는 잠정이에요. 1·2등을 제외한 팀 중 1팀은 채운 칸 수만큼 쪽지를 받아 추첨해요.
      </p>
    </>
  );
}
