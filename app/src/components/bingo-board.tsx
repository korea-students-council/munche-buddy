"use client";

import { useState } from "react";
import type { TeamColorKey } from "@/lib/rules";

/** 빙고판 한 칸 (서버에서 문구까지 만들어 넘긴다) */
export type BoardCell = {
  position: number;
  number: number;
  title: string;
  description: string;
  face: boolean;
  requirePhoto: boolean;
  filled: boolean;
  inLine: boolean;
  today: boolean;
  /** 상세 패널에 보여 줄 기한 안내 */
  when: string;
};

/** 팀이 고른 판 색: [빙고 줄 칸, 인증한 칸] */
export const TEAM_FILL: Record<TeamColorKey, [string, string]> = {
  MINT: ["bg-sky", "bg-sky-soft"],
  PINK: ["bg-mocha", "bg-cocoa-soft"],
};

export function commandFor(c: Pick<BoardCell, "number" | "requirePhoto">) {
  return `/인증 번호:${c.number}${c.requirePhoto ? " 사진:[첨부]" : ""}`;
}

/**
 * 누르면 오른쪽(모바일은 아래)에 미션 상세와 인증 명령어가 열리는 빙고판.
 * withCommand 가 false면 다른 팀 판이라 명령어 복사는 숨긴다.
 */
export function BingoBoard({
  n,
  color,
  cells,
  withCommand = true,
}: {
  n: number;
  color: TeamColorKey;
  cells: BoardCell[];
  withCommand?: boolean;
}) {
  const initial = cells.find((c) => c.today && !c.filled) ?? cells.find((c) => !c.filled) ?? cells[0];
  const [sel, setSel] = useState(initial?.position ?? 0);
  const [onlyLeft, setOnlyLeft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [line, soft] = TEAM_FILL[color];
  const current = cells.find((c) => c.position === sel) ?? cells[0];

  function pick(p: number) {
    setSel(p);
    setCopied(false);
  }

  function copy() {
    if (!current) return;
    setCopied(true);
    // 권한 확인을 기다리느라 버튼이 멈춰 보이지 않게 결과는 기다리지 않는다.
    // 클립보드를 못 쓰면 화면에 보이는 명령어를 직접 복사하면 된다.
    navigator.clipboard?.writeText(commandFor(current)).catch(() => {});
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-label="빙고판" className="min-w-0 flex-[999_1_34rem]">
        <div role="group" aria-label="보기 방식" className="mb-3 ml-auto grid w-56 grid-cols-2 rounded-2xl bg-[#e6ecf0] p-1">
          {[
            [false, "전체 보기"],
            [true, "남은 칸만"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={onlyLeft === v}
              onClick={() => setOnlyLeft(v as boolean)}
              className={`h-9 rounded-xl text-[13px] font-bold transition-colors ${onlyLeft === v ? "bg-white shadow-[0_2px_6px_rgba(48,29,21,0.08)]" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="grid"
          aria-label={`${n}×${n} 빙고판`}
          className="grid gap-1.5 rounded-[1.6rem] bg-white p-2 sm:gap-2.5 sm:rounded-[2rem] sm:p-3.5"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {cells.map((c) => {
            const isSel = c.position === sel;
            const bg = c.inLine ? line : c.filled ? soft : c.face ? "bg-white" : "bg-well";
            const ring = isSel
              ? "shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--ink)]"
              : c.today && !c.filled
                ? "shadow-[inset_0_0_0_2px_var(--ink)]"
                : c.face && !c.filled
                  ? "shadow-[inset_0_0_0_1.5px_rgba(48,29,21,0.28)]"
                  : "";
            return (
              <button
                key={c.position}
                type="button"
                role="gridcell"
                aria-label={`${c.number}번 ${c.title}${c.filled ? ", 인증 완료" : ""}${c.face ? ", 대면 미션" : ""}${c.today ? ", 오늘 미션" : ""}`}
                aria-selected={isSel}
                onClick={() => pick(c.position)}
                className={`flex aspect-square min-w-0 flex-col items-start justify-between overflow-hidden rounded-xl p-1.5 text-left transition-[transform,opacity,box-shadow] duration-300 [transition-timing-function:var(--spring)] sm:rounded-[1.2rem] sm:p-3 ${bg} ${ring} ${isSel ? "scale-[1.05]" : "hover:scale-[1.03]"} ${onlyLeft && c.filled ? "opacity-25" : ""}`}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="text-[15px] font-black leading-none tracking-[-0.02em] sm:text-xl">{c.number}</span>
                  {c.filled ? (
                    <span className="pop inline-flex size-4 items-center justify-center rounded-full bg-ink text-[9px] font-black text-white sm:size-[22px] sm:text-xs" aria-hidden="true">
                      ✓
                    </span>
                  ) : c.today ? (
                    <span className="hidden rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white sm:inline">오늘</span>
                  ) : c.face ? (
                    <span className="hidden rounded-full bg-cocoa-soft px-2 py-0.5 text-[11px] font-bold sm:inline">대면</span>
                  ) : null}
                </span>
                <span className="line-clamp-2 break-words text-[9.5px] font-medium leading-[1.25] sm:text-[13px] sm:leading-[1.3]">{c.title}</span>
              </button>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-sub sm:text-[13px]">
          <li className="inline-flex items-center gap-1.5"><span className={`size-3.5 rounded-[5px] ${line}`} />빙고 줄</li>
          <li className="inline-flex items-center gap-1.5"><span className={`size-3.5 rounded-[5px] ${soft}`} />인증 완료</li>
          <li className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[5px] bg-white shadow-[inset_0_0_0_1.5px_rgba(48,29,21,0.28)]" />대면 칸</li>
          <li className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[5px] shadow-[inset_0_0_0_2px_var(--ink)]" />오늘 미션</li>
        </ul>
      </section>

      {current && (
        <aside aria-live="polite" className="card min-w-0 flex-[1_1_19rem] p-6 shadow-[0_12px_32px_-18px_rgba(48,29,21,0.25)] lg:sticky lg:top-36 lg:mt-12">
          <div className="flex flex-wrap gap-2 text-[13px] font-bold">
            <span className={`rounded-full px-3 py-1 ${current.face ? "bg-cocoa-soft" : "bg-well"}`}>{current.face ? "대면 미션" : "비대면 미션"}</span>
            <span className={`rounded-full px-3 py-1 ${current.filled ? "bg-sky" : "bg-ink text-white"}`}>{current.filled ? "인증 완료" : "아직 인증 전"}</span>
            {!current.requirePhoto && <span className="rounded-full bg-sky-soft px-3 py-1">사진 선택</span>}
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <span
              className={`inline-flex size-[3.75rem] shrink-0 items-center justify-center rounded-[1.4rem] text-[1.6rem] font-black ${current.filled ? "bg-sky" : current.face ? "bg-cocoa-soft" : "bg-ink text-white"}`}
            >
              {current.number}
            </span>
            <span className="text-[1.4rem] font-black leading-snug tracking-[-0.03em]">{current.title}</span>
          </div>
          {current.description && <p className="mt-3 text-sm text-sub">{current.description}</p>}
          <p className="mt-3 text-sub">{current.when}</p>
          {withCommand && (
            <>
              <p className="mt-4 rounded-[1.1rem] bg-well px-4 py-3.5 font-mono text-sm font-semibold">{commandFor(current)}</p>
              <button
                type="button"
                onClick={copy}
                className={`btn mt-3 h-[3.4rem] w-full rounded-[1.1rem] text-[15px] ${copied ? "bg-sky text-ink" : "btn-primary"}`}
              >
                {copied ? "복사했어요! 디스코드에 붙여 넣으세요" : "명령어 복사하기"}
              </button>
              <p className="mt-3 text-[13px] text-muted">디스코드 인증 채널에 붙여 넣고 사진을 첨부하면 바로 칸이 채워져요.</p>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
