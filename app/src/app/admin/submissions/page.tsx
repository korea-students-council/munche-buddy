import Link from "next/link";
import { Badge, Card, EmptyState, PageTitle, btn, inputCls } from "@/components/ui";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { refreshAttachmentUrls } from "@/lib/discord";
import { formatKst } from "@/lib/time";
import type { Prisma } from "@prisma/client";
import { rejectSubmission, restoreSubmission } from "../actions";

const PAGE_SIZE = 20;

type SP = { ok?: string; error?: string; status?: string; mission?: string; q?: string; page?: string };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const event = await getActiveEvent();
  if (!event) return <EmptyState>활성 시즌이 없어요.</EmptyState>;

  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.SubmissionWhereInput = { eventId: event.id };
  if (sp.status === "ACCEPTED" || sp.status === "REJECTED") where.status = sp.status;
  if (sp.mission) where.missionId = sp.mission;
  if (sp.q) {
    const num = Number(sp.q);
    where.team = Number.isInteger(num) ? { number: num } : { name: { contains: sp.q, mode: "insensitive" } };
  }

  const [rows, count, missions] = await Promise.all([
    db.submission.findMany({
      where,
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { team: true, mission: true, user: true, reviewer: true },
    }),
    db.submission.count({ where }),
    db.mission.findMany({ where: { eventId: event.id }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  // 사진 주소는 일정 시간 뒤 만료되므로 새 주소를 받아 온다
  const urls = await refreshAttachmentUrls(rows.flatMap((r) => r.attachmentUrls));

  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, mission: sp.mission, q: sp.q, page: String(page), ...over };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/submissions?${p.toString()}`;
  };
  const returnTo = qs({});

  return (
    <>
      <PageTitle title="인증 검수" desc={`봇이 자동으로 인정한 인증과 사진을 확인하고, 문제가 있으면 반려해요 · 총 ${count}건`} />
      <Flash ok={sp.ok} error={sp.error} />

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/admin/submissions">
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} !w-auto`} aria-label="상태">
          <option value="">전체 상태</option>
          <option value="ACCEPTED">인정</option>
          <option value="REJECTED">반려</option>
        </select>
        <select name="mission" defaultValue={sp.mission ?? ""} className={`${inputCls} !w-auto max-w-56`} aria-label="미션">
          <option value="">전체 미션</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.number}번 {m.title}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="조 번호 또는 팀명" className={`${inputCls} !w-44`} />
        <button className={btn.secondary}>검색</button>
      </form>

      <div className="space-y-3">
        {rows.map((s) => {
          const link =
            event.guildId && s.replyMessageId ? `https://discord.com/channels/${event.guildId}/${s.channelId}/${s.replyMessageId}` : null;
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm">
                    <b>
                      {s.team.number}조 {s.team.name}
                    </b>{" "}
                    <span className="text-muted">→</span>{" "}
                    <b>
                      {s.mission.number}번 {s.mission.title}
                    </b>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatKst(s.postedAt)} · {s.source === "MANUAL" ? "운영진 수동 처리" : `인증한 사람: ${s.user?.name ?? "-"}`}
                    {!s.mission.requirePhoto && " · 사진 선택 미션"}
                  </p>
                </div>
                <Badge tone={s.status === "ACCEPTED" ? "good" : "bad"}>{s.status === "ACCEPTED" ? "인정" : "반려"}</Badge>
              </div>

              {s.attachmentUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.attachmentUrls.map((u, i) => {
                    const fresh = urls.get(u) ?? u;
                    return (
                      <a key={u} href={fresh} target="_blank" rel="noreferrer noopener" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fresh} alt={`인증 사진 ${i + 1}`} loading="lazy" className="h-32 w-auto max-w-56 rounded-xl object-cover" />
                      </a>
                    );
                  })}
                </div>
              ) : (
                s.source === "DISCORD" && <p className="mt-3 text-xs font-bold text-muted">사진 없이 인증됨</p>
              )}
              {link && (
                <a href={link} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-xs font-bold underline underline-offset-2">
                  디스코드에서 보기
                </a>
              )}

              {s.status === "REJECTED" ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
                  <span>
                    사유: {s.rejectReason}
                    {s.reviewer ? ` · ${s.reviewer.name}` : " · 자동"}
                    {s.reviewedAt ? ` · ${formatKst(s.reviewedAt)}` : ""}
                  </span>
                  <form action={restoreSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className={btn.small}>복구</button>
                  </form>
                </div>
              ) : (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-bold text-bad">반려하기</summary>
                  <form action={rejectSubmission} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input name="reason" required maxLength={300} placeholder="반려 사유 (예: 팀원 전원이 나오지 않은 사진)" className={`${inputCls} flex-1`} />
                    <button className={btn.danger}>반려</button>
                  </form>
                </details>
              )}
            </Card>
          );
        })}
        {rows.length === 0 && <EmptyState>조건에 맞는 인증이 없어요.</EmptyState>}
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="페이지">
          {page > 1 && (
            <Link href={qs({ page: String(page - 1) })} className={btn.small}>
              ← 이전
            </Link>
          )}
          <span className="text-muted">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={qs({ page: String(page + 1) })} className={btn.small}>
              다음 →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
