"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar, Badge } from "@/components/chips";
import { btn } from "@/components/styles";
import { ConfirmButton } from "@/components/confirm-button";
import { COLOR_LABEL, TEAM_MAX, TEAM_MIN, type TeamColorKey } from "@/lib/rules";
import { deleteTeam, placeMember } from "../actions";

type Person = { id: string; name: string; avatar: string | null };
type TeamCol = { id: string; number: number; name: string; color: TeamColorKey; submitted: boolean; members: Person[] };

/**
 * 드래그 앤 드롭 팀 편성판. 사람 칩을 끌어 팀 칸이나 "배정 대기"에 놓는다.
 * 터치에서도 되도록 포인터 이벤트로 직접 끈다. 놓는 즉시 화면을 바꾸고, 실패하면 되돌린다.
 */
export function TeamDnd({ free: freeInit, teams: teamsInit }: { free: Person[]; teams: TeamCol[] }) {
  const router = useRouter();
  const [free, setFree] = useState(freeInit);
  const [teams, setTeams] = useState(teamsInit);
  const [drag, setDrag] = useState<{ p: Person; x: number; y: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const [q, setQ] = useState("");

  const zoneAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest("[data-zone]") as HTMLElement | null)?.dataset.zone ?? null;

  function begin(e: React.PointerEvent, p: Person) {
    if (e.button !== 0) return;
    e.preventDefault();
    setDrag({ p, x: e.clientX, y: e.clientY });
    const move = (ev: PointerEvent) => {
      setDrag((d) => d && { ...d, x: ev.clientX, y: ev.clientY });
      setOver(zoneAt(ev.clientX, ev.clientY));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const zone = zoneAt(ev.clientX, ev.clientY);
      setDrag(null);
      setOver(null);
      if (zone) drop(p, zone === "free" ? null : zone);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function drop(p: Person, toTeamId: string | null) {
    const from = teams.find((t) => t.members.some((m) => m.id === p.id))?.id ?? null;
    if (from === toTeamId) return;
    const target = teams.find((t) => t.id === toTeamId);
    if (target && target.members.length >= TEAM_MAX) return setMsg(`${target.number}조는 이미 ${TEAM_MAX}명이에요.`);
    const prev = { free, teams };
    setFree((f) => (toTeamId ? f.filter((x) => x.id !== p.id) : [p, ...f.filter((x) => x.id !== p.id)]));
    setTeams((ts) =>
      ts.map((t) => ({
        ...t,
        members: t.id === toTeamId ? [...t.members, p] : t.members.filter((m) => m.id !== p.id),
      })),
    );
    setMsg("");
    start(async () => {
      const res = await placeMember({ person: p, toTeamId });
      if (!res.ok) {
        setFree(prev.free);
        setTeams(prev.teams);
        setMsg(res.error);
      } else router.refresh();
    });
  }

  const chip = (p: Person) => (
    <li
      key={p.id}
      onPointerDown={(e) => begin(e, p)}
      className={`flex cursor-grab touch-none select-none items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-bold shadow-[0_1px_2px_rgba(31,42,38,0.1)] ring-1 ring-line active:cursor-grabbing ${drag?.p.id === p.id ? "opacity-30" : ""}`}
    >
      <Avatar name={p.name} src={p.avatar} size={24} />
      {p.name}
    </li>
  );
  const zone = (id: string) =>
    `rounded-2xl transition-colors ${over === id ? "bg-mint-soft ring-2 ring-mint" : ""}`;
  const shown = q ? free.filter((p) => p.name.includes(q)) : free;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <section data-zone="free" className={`card p-4 lg:sticky lg:top-32 lg:self-start ${zone("free")}`}>
        <h2 className="font-black">
          배정 대기 <Badge tone={free.length ? "sun" : "good"}>{free.length}명</Badge>
        </h2>
        <p className="mt-1 text-xs text-muted">사람을 끌어서 팀에 놓아요. 여기로 다시 끌어오면 팀에서 빠져요.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" className="field mt-3 !py-2 !text-sm" />
        <ul className="mt-3 flex max-h-[60vh] flex-wrap content-start gap-1.5 overflow-y-auto">
          {shown.map(chip)}
          {free.length === 0 && <li className="text-sm text-muted">모두 배정했어요.</li>}
        </ul>
      </section>

      <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {msg && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-bold text-bad sm:col-span-2 xl:col-span-3">{msg}</p>}
        {teams.map((t) => {
          const okSize = t.members.length >= TEAM_MIN && t.members.length <= TEAM_MAX;
          return (
            <section key={t.id} data-zone={t.id} className={`card flex min-h-40 flex-col p-4 ${zone(t.id)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-black">
                  {t.number}조 <span className="font-bold text-sub">{t.name || "팀명 미정"}</span>
                </span>
                <Badge tone={okSize ? "good" : "bad"}>
                  {t.members.length}/{TEAM_MAX}
                </Badge>
              </div>
              <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                {t.members.map(chip)}
                {t.members.length === 0 && <li className="text-sm text-muted">여기에 놓아요</li>}
              </ul>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                {t.submitted && <Badge tone="good">제출 · {COLOR_LABEL[t.color]}</Badge>}
                <Link href={`/admin/teams/${t.id}`} className={`${btn.small} ml-auto`}>
                  빙고판·인증
                </Link>
                <form action={deleteTeam}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmButton message={`${t.number}조를 삭제할까요?`} className={btn.small}>
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            </section>
          );
        })}
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 rotate-3 items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-bold shadow-xl ring-2 ring-mint"
          style={{ left: drag.x, top: drag.y }}
        >
          <Avatar name={drag.p.name} src={drag.p.avatar} size={24} />
          {drag.p.name}
        </div>
      )}
    </div>
  );
}
