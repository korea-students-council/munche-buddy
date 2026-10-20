import { Badge, Card, EmptyState, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { getStandings } from "@/lib/standings";
import { maxLines } from "@/lib/bingo";
import { BOARD_SIZE, CELL_COUNT, FACE_COUNT } from "@/lib/rules";
import { formatKst } from "@/lib/time";
import { drawRaffleAction, finalizeEvent, unfinalizeEvent } from "../actions";

export default async function AdminRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const event = await getActiveEvent();
  if (!event) return <EmptyState>활성 시즌이 없어요.</EmptyState>;

  const [standings, winners] = await Promise.all([
    getStandings(event.id),
    db.winner.findMany({ where: { eventId: event.id }, include: { team: true } }),
  ]);
  const ranked = standings.filter((s) => s.submitted);
  const w = (kind: "FIRST" | "SECOND" | "RAFFLE") => winners.find((x) => x.kind === kind);

  // 기본 선택: 현재 순위 1·2위 (채운 칸이 있는 팀만). 저장된 당첨자가 있으면 그것을 우선
  const auto = ranked.filter((s) => s.filled > 0);
  const firstId = w("FIRST")?.teamId ?? auto[0]?.teamId ?? "";
  const secondId = w("SECOND")?.teamId ?? auto[1]?.teamId ?? "";
  const raffleId = w("RAFFLE")?.teamId ?? "";
  const tieAtCut = auto.length >= 2 && (auto[0].rank === auto[1].rank || (auto[2] && auto[1].rank === auto[2].rank));
  const candidates = ranked.filter((s) => s.teamId !== firstId && s.teamId !== secondId && s.filled > 0);
  const totalTickets = candidates.reduce((sum, c) => sum + c.filled, 0);
  const label = (s: (typeof ranked)[number]) => `${s.number}조 ${s.name} (${s.lines}줄·${s.filled}칸·대면${s.faceCount})`;

  return (
    <>
      <PageTitle
        title="순위·시상"
        desc="빙고 줄 → 채운 칸 → 대면 미션 수로 1·2등을 정하고, 나머지 팀 중 1팀을 추첨해요"
        action={
          <a href="/admin/ranking/export" className={btn.secondary}>
            CSV 내보내기
          </a>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-black">
            시상 확정 {event.finalizedAt && <Badge tone="good">{formatKst(event.finalizedAt)} 확정</Badge>}
          </h2>
          {event.finalizedAt && (
            <form action={unfinalizeEvent}>
              <input type="hidden" name="eventId" value={event.id} />
              <ConfirmButton message="확정을 취소하면 다시 인증이 반영돼요. 계속할까요?" className={btn.secondary}>
                확정 취소
              </ConfirmButton>
            </form>
          )}
        </div>

        {tieAtCut && !event.finalizedAt && (
          <p className="mt-3 rounded-xl bg-sun-soft px-3 py-2 text-sm font-bold">
            ⚠️ 1·2등 경계에 동점 팀이 있어요. 아래에서 시상할 팀을 직접 골라 주세요.
          </p>
        )}

        <form className="mt-4 space-y-4">
          <input type="hidden" name="eventId" value={event.id} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label={`🥇 1등 팀 · ${event.prize1 || "상품 미정"}`}>
              <TeamSelect name="first" value={firstId} teams={ranked} label={label} disabled={!!event.finalizedAt} />
            </Field>
            <Field label={`🥈 2등 팀 · ${event.prize2 || "상품 미정"}`}>
              <TeamSelect name="second" value={secondId} teams={ranked} label={label} disabled={!!event.finalizedAt} allowEmpty />
            </Field>
            <Field label={`🎁 추첨 팀 · ${event.prizeRaffle || "상품 미정"}`} hint="아래에서 추첨하거나, 직접 추첨한 결과를 선택해요">
              <TeamSelect name="raffle" value={raffleId} teams={ranked} label={label} disabled={!!event.finalizedAt} allowEmpty />
            </Field>
          </div>
          {!event.finalizedAt && (
            <div className="flex flex-wrap gap-2">
              <button formAction={drawRaffleAction} className={btn.secondary} disabled={candidates.length === 0}>
                🎲 추첨하기
              </button>
              <ConfirmButton
                message="선택한 팀으로 시상을 확정할까요? 이후에는 새 인증이 반영되지 않아요."
                formAction={finalizeEvent}
                className={btn.primary}
              >
                최종 확정
              </ConfirmButton>
            </div>
          )}
        </form>
      </Card>

      {!event.finalizedAt && (
        <Card className="mb-6">
          <h2 className="font-black">추첨 후보 · 쪽지 {totalTickets}장</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            1·2등을 뺀 팀이에요. 채운 칸 수만큼 쪽지를 받고, 쪽지가 많을수록 뽑힐 확률이 높아요. 직접 쪽지를 뽑는다면 이 표의 쪽지 수를 참고하세요.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1.5 text-left">팀</th>
                  <th className="py-1.5 text-right">쪽지 수</th>
                  <th className="py-1.5 text-right">당첨 확률</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.teamId} className="border-t border-line">
                    <td className="py-1.5">
                      {c.number}조 {c.name}
                    </td>
                    <td className="py-1.5 text-right font-bold">{c.filled}</td>
                    <td className="py-1.5 text-right text-muted">{totalTickets ? ((c.filled / totalTickets) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted">
                      추첨 후보가 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-line bg-sun-soft text-xs">
            <tr>
              <th className="px-3 py-2.5 text-center">순위</th>
              <th className="px-3 py-2.5 text-left">팀</th>
              <th className="px-3 py-2.5 text-right">빙고 줄</th>
              <th className="px-3 py-2.5 text-right">채운 칸</th>
              <th className="px-3 py-2.5 text-right">대면</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s) => (
              <tr key={s.teamId} className="border-t border-line">
                <td className="font-display px-3 py-2.5 text-center text-lg">{s.rank}</td>
                <td className="px-3 py-2.5">
                  <b>
                    {s.number}조 {s.name}
                  </b>
                  <span className="block text-xs text-muted">{s.members.join(" · ")}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-black">
                  {s.lines}/{maxLines(BOARD_SIZE)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {s.filled}/{CELL_COUNT}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {s.faceCount}/{FACE_COUNT}
                </td>
              </tr>
            ))}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted">
                  빙고판을 제출한 팀이 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TeamSelect({
  name,
  value,
  teams,
  label,
  disabled,
  allowEmpty,
}: {
  name: string;
  value: string;
  teams: { teamId: string; number: number; name: string; lines: number; filled: number; faceCount: number }[];
  label: (s: never) => string;
  disabled?: boolean;
  allowEmpty?: boolean;
}) {
  return (
    <select name={name} defaultValue={value} disabled={disabled} className={inputCls}>
      {(allowEmpty || !value) && <option value="">선택 안 함</option>}
      {teams.map((t) => (
        <option key={t.teamId} value={t.teamId}>
          {(label as (s: typeof t) => string)(t)}
        </option>
      ))}
    </select>
  );
}
