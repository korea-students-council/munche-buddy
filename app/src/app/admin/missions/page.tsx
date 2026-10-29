import { Badge, Card, EmptyState, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { FACE_COUNT, REMOTE_COUNT } from "@/lib/rules";
import { kstDay, toKstInput } from "@/lib/time";
import { addMissions, autoSchedule, deleteMission, updateMission } from "../actions";
import type { Mission } from "@prisma/client";

export default async function MissionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const event = await getActiveEvent();
  if (!event) return <EmptyState href="/admin/event?new=1" cta="시즌 만들기">먼저 시즌을 만들어 주세요.</EmptyState>;

  const [missions, cellCounts] = await Promise.all([
    db.mission.findMany({ where: { eventId: event.id }, orderBy: { number: "asc" } }),
    db.teamCell.groupBy({ by: ["missionId"], where: { team: { eventId: event.id } }, _count: true }),
  ]);
  const holders = new Map(cellCounts.map((c) => [c.missionId, c._count]));
  const face = missions.filter((m) => m.type === "FACE");
  const remote = missions
    .filter((m) => m.type === "REMOTE")
    .sort((a, b) => (a.day ?? "9999").localeCompare(b.day ?? "9999") || a.number - b.number);
  const unscheduled = remote.filter((m) => !m.publishAt).length;

  return (
    <>
      <PageTitle
        title="미션 관리"
        desc={`${event.name} · 대면 ${face.length}/${FACE_COUNT}개 · 비대면 ${remote.length}개 (${REMOTE_COUNT}개 이상 필요) · 일정 없는 비대면 ${unscheduled}개`}
      />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">미션 추가</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            한 줄에 미션 하나. <code>제목 | 설명</code> 형식으로 설명도 쓸 수 있어요. 번호는 이어서 자동으로 붙어요.
          </p>
          <form action={addMissions} className="space-y-3">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="유형">
                <select name="type" className={inputCls} defaultValue="REMOTE">
                  <option value="REMOTE">비대면 (매일 1개 공지)</option>
                  <option value="FACE">대면 (시즌에 {FACE_COUNT}개, 시작일 일괄 공지)</option>
                </select>
              </Field>
              <Field label="인증 사진">
                <select name="photo" className={inputCls} defaultValue="required">
                  <option value="required">필수</option>
                  <option value="optional">선택 (없어도 인증 가능)</option>
                </select>
              </Field>
            </div>
            <textarea
              name="titles"
              rows={6}
              required
              placeholder={"아침 7시 전에 일어나기 | 시계가 보이게 찍어주세요\n물 2L 마시기\n오늘 하늘 사진 찍기"}
              className={inputCls}
            />
            <button className={btn.primary}>추가</button>
          </form>
        </Card>

        <Card>
          <h2 className="font-black">비대면 일정 자동 배정</h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            일정이 없는 비대면 미션 {unscheduled}개를 시작 날짜부터 하루에 하나씩 배정해요. (이미 배정된 날짜는 건너뛰어요)
          </p>
          <form action={autoSchedule} className="space-y-3">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="시작 날짜">
                <input type="date" name="startDay" required defaultValue={kstDay(event.startAt)} className={inputCls} />
              </Field>
              <Field label="공지 시각">
                <input type="time" name="publishTime" defaultValue="07:00" required className={inputCls} />
              </Field>
              <Field label="마감 시각">
                <input type="time" name="deadlineTime" defaultValue="23:59" required className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="shuffle" className="size-4 accent-ink" /> 순서 섞기
            </label>
            <button className={btn.secondary} disabled={unscheduled === 0}>
              자동 배정
            </button>
          </form>
        </Card>
      </div>

      <h2 className="font-display mb-3 text-2xl">대면 미션</h2>
      <div className="mb-8 space-y-3">
        {face.map((m) => (
          <MissionForm key={m.id} m={m} holders={holders.get(m.id) ?? 0} />
        ))}
        {face.length === 0 && <EmptyState>등록된 대면 미션이 없어요.</EmptyState>}
      </div>

      <h2 className="font-display mb-3 text-2xl">비대면 미션</h2>
      <div className="space-y-3">
        {remote.map((m) => (
          <MissionForm key={m.id} m={m} holders={holders.get(m.id) ?? 0} />
        ))}
        {remote.length === 0 && <EmptyState>등록된 비대면 미션이 없어요.</EmptyState>}
      </div>
    </>
  );
}

function MissionForm({ m, holders }: { m: Mission; holders: number }) {
  const face = m.type === "FACE";
  return (
    <Card>
      <form action={updateMission} className="space-y-3">
        <input type="hidden" name="id" value={m.id} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={face ? "sun" : "mint"}>{face ? "대면" : "비대면"}</Badge>
          {!face && (m.day ? <Badge tone="sun">{m.day}</Badge> : <Badge>일정 없음</Badge>)}
          {m.announcedAt && <Badge tone="good">공지됨</Badge>}
          {!m.requirePhoto && <Badge tone="pink">사진 선택</Badge>}
          <Badge>{holders}팀 보유</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr]">
          <Field label="번호">
            <input name="number" type="number" min={1} required defaultValue={m.number} className={inputCls} />
          </Field>
          <Field label="제목">
            <input name="title" required defaultValue={m.title} maxLength={100} className={inputCls} />
          </Field>
          <Field label="설명">
            <input name="description" defaultValue={m.description} maxLength={300} className={inputCls} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="유형">
            <select name="type" defaultValue={m.type} className={inputCls}>
              <option value="REMOTE">비대면</option>
              <option value="FACE">대면</option>
            </select>
          </Field>
          <Field label="인증 사진">
            <select name="photo" defaultValue={m.requirePhoto ? "required" : "optional"} className={inputCls}>
              <option value="required">필수</option>
              <option value="optional">선택</option>
            </select>
          </Field>
          <Field label="공지 날짜" hint={face ? "대면은 일정 없음" : "비우면 일정 없음"}>
            <input type="date" name="day" defaultValue={m.day ?? ""} disabled={face} className={inputCls} />
          </Field>
          <Field label="공지 시각">
            <input type="time" name="publishTime" defaultValue={m.publishAt ? toKstInput(m.publishAt).slice(11) : "07:00"} disabled={face} className={inputCls} />
          </Field>
          <Field label="마감 시각">
            <input type="time" name="deadlineTime" defaultValue={m.deadlineAt ? toKstInput(m.deadlineAt).slice(11) : "23:59"} disabled={face} className={inputCls} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button className={btn.primary}>저장</button>
          <ConfirmButton message={`${m.number}번 "${m.title}" 미션을 삭제할까요?`} formAction={deleteMission} formNoValidate className={btn.secondary}>
            삭제
          </ConfirmButton>
        </div>
        {face && <p className="text-xs text-muted">유형을 바꾸고 저장하면 일정 입력칸이 바뀌어요. 대면 미션은 시즌 시작~최종 마감까지 인증할 수 있어요.</p>}
      </form>
    </Card>
  );
}
