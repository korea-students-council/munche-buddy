import { Badge, Card, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { PHASE_LABEL, eventPhase, getActiveEvent } from "@/lib/event";
import { formatKst, toKstInput } from "@/lib/time";
import { appUrl } from "@/lib/env";
import { activateEvent, registerSlashCommand, runAnnounceNow, saveEvent } from "../actions";

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; new?: string }>;
}) {
  const sp = await searchParams;
  const [active, all] = await Promise.all([getActiveEvent(), db.event.findMany({ orderBy: { createdAt: "desc" } })]);
  const creating = !active || sp.new === "1";
  const e = creating ? null : active;

  // 새 시즌 기본값: 약 일주일 뒤 00:00 시작, 3주 뒤 최종 마감
  const defStart = new Date(Math.ceil((Date.now() + 7 * 86400000) / 86400000) * 86400000 - 9 * 3600000);
  const defEnd = new Date(defStart.getTime() + 21 * 86400000 - 60_000);

  return (
    <>
      <PageTitle title={creating ? "새 시즌 만들기" : "시즌 설정"} desc="기간·디스코드 채널·시상을 설정해요 (빙고판은 5×5 고정)" />
      <Flash ok={sp.ok} error={sp.error} />

      <form action={saveEvent} className="space-y-6">
        {e && <input type="hidden" name="id" value={e.id} />}
        <Card className="space-y-4">
          <h2 className="font-black">기본 정보</h2>
          <Field label="시즌 이름">
            <input name="name" required defaultValue={e?.name ?? "짝꽁 사업"} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="시작 일시 (KST)" hint="이 시각에 빙고판이 잠기고 대면 미션이 공지돼요">
              <input name="startAt" type="datetime-local" required defaultValue={toKstInput(e?.startAt ?? defStart)} className={inputCls} />
            </Field>
            <Field label="최종 마감 일시 (KST)" hint="대면 미션 인증 마감. 보통 마지막 날 23:59">
              <input name="endAt" type="datetime-local" required defaultValue={toKstInput(e?.endAt ?? defEnd)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-black">디스코드 연동</h2>
          <p className="text-sm text-muted">
            디스코드 앱 설정 → 고급 → <b>개발자 모드</b>를 켠 뒤, 서버/채널을 우클릭해 &quot;ID 복사&quot;를 누르면 돼요.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="서버(길드) ID">
              <input name="guildId" defaultValue={e?.guildId ?? ""} inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="미션 공지 채널 ID" hint="매일 오전 7시 비대면 미션을 공지해요">
              <input name="announceChannelId" defaultValue={e?.announceChannelId ?? ""} inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="인증 채널 ID" hint="/인증 명령은 이 채널에서만 동작해요">
              <input name="verifyChannelId" defaultValue={e?.verifyChannelId ?? ""} inputMode="numeric" className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-black">시상</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="🥇 1등 팀">
              <input name="prize1" defaultValue={e?.prize1 ?? ""} className={inputCls} />
            </Field>
            <Field label="🥈 2등 팀">
              <input name="prize2" defaultValue={e?.prize2 ?? ""} className={inputCls} />
            </Field>
            <Field label="🎁 추첨 1팀" hint="1·2등을 뺀 팀 중 채운 칸 수만큼 쪽지로 추첨">
              <input name="prizeRaffle" defaultValue={e?.prizeRaffle ?? ""} className={inputCls} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <button className={btn.primary}>{creating ? "시즌 만들기" : "저장"}</button>
          {!creating && (
            <a href="/admin/event?new=1" className={btn.secondary}>
              새 시즌 만들기
            </a>
          )}
        </div>
      </form>


      {!creating && (
        <Card className="mt-8 space-y-4">
          <h2 className="font-black">디스코드 /인증 연결</h2>
          <p className="text-sm text-muted">
            개발자 포털 → General Information → <b>Interactions Endpoint URL</b>에 아래 주소를 붙여 넣고 저장하면, 디스코드가 /인증 명령을 이 서비스로 보내줘요.
          </p>
          <code className="block break-all rounded-xl bg-mint-soft px-3 py-2 text-sm font-bold">
            {appUrl()}/api/discord/interactions
          </code>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            <Status ok={!!process.env.DISCORD_PUBLIC_KEY} label="DISCORD_PUBLIC_KEY (포털의 Public Key)" />
            <Status ok={!!process.env.DISCORD_BOT_TOKEN} label="DISCORD_BOT_TOKEN" />
            <Status ok={!!process.env.DISCORD_CLIENT_ID} label="DISCORD_CLIENT_ID" />
            <Status ok={!!process.env.CRON_SECRET} label="CRON_SECRET (매일 7시 자동 공지)" />
          </ul>
          <div className="flex flex-wrap gap-2">
            <form action={registerSlashCommand}>
              <button className={btn.primary}>/인증 명령 등록</button>
            </form>
            <form action={runAnnounceNow}>
              <button className={btn.secondary}>지금 미션 공지 실행</button>
            </form>
          </div>
          <p className="text-xs text-muted">
            미션 공지는 매일 오전 7시대에 자동으로 올라가요. 무료 플랜에서는 7시대 중 한 시점에 실행돼서, 급하면 &quot;지금 미션 공지 실행&quot;을 눌러도 돼요.
          </p>
        </Card>
      )}

      {all.length > 1 && (
        <Card className="mt-8">
          <h2 className="mb-3 font-black">전체 시즌</h2>
          <ul className="divide-y divide-line text-sm">
            {all.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{ev.name}</b> <span className="text-xs text-muted">{formatKst(ev.startAt)} ~ {formatKst(ev.endAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge>{PHASE_LABEL[eventPhase(ev)]}</Badge>
                  {ev.isActive ? (
                    <Badge tone="good">활성</Badge>
                  ) : (
                    <form action={activateEvent}>
                      <input type="hidden" name="id" value={ev.id} />
                      <button className={btn.small}>활성화</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Badge tone={ok ? "good" : "bad"}>{ok ? "설정됨" : "없음"}</Badge>
      <span className="text-xs">{label}</span>
    </li>
  );
}
