"use client";

import { useRef, useState, useTransition } from "react";
import { saveDecor } from "@/app/board/actions";
import {
  BUILTIN_STICKERS,
  CELL_COLORS,
  MAX_STICKERS,
  STICKER_CATS,
  TEXT_MAX,
  TEXT_STYLES,
  THEMES,
  cellColor,
  isHex,
  textStickerSrc,
  themeColor,
  type Decor,
  type DecorItem,
  type StickerSrc,
  type TextStyle,
} from "@/lib/decor";
import { BingoBoard, type BoardCell } from "./bingo-board";
import type { TeamColorKey } from "@/lib/rules";

/**
 * 스티커와 테두리 색으로 꾸민 빙고판. canEdit 이면 "꾸미기"로 스티커를 붙이고 끌고 돌릴 수 있다.
 * 스티커 층은 평소엔 클릭을 통과시켜서 칸 누르기를 막지 않는다.
 */
export function DecoratedBoard({
  decor: init,
  stickers = [],
  canEdit = false,
  ...board
}: {
  n: number;
  color: TeamColorKey;
  cells: BoardCell[];
  withCommand?: boolean;
  decor: Decor;
  stickers?: StickerSrc[];
  canEdit?: boolean;
}) {
  const [saved, setSaved] = useState(init);
  const [decor, setDecor] = useState(init);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  /** 칸 칠하기 붓: null 이면 끔, "" 이면 지우개 */
  const [brush, setBrush] = useState<string | null>(null);
  const paint = (p: number) => setDecor((d) => ({ ...d, cells: d.cells.map((k, i) => (i === p ? (k === brush ? "" : brush ?? "") : k)) }));
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const layer = useRef<HTMLDivElement>(null);
  const all = [...BUILTIN_STICKERS, ...stickers];
  const srcOf = (it: DecorItem) => (it.id === "t:text" ? textStickerSrc(it.t ?? "", it.s, it.c) : all.find((s) => s.id === it.id)?.src);
  const cats = [...STICKER_CATS.filter((c) => all.some((s) => s.cat === c)), "직접 만들기"];
  const [tab, setTab] = useState<string>(cats[0]);
  const [txt, setTxt] = useState({ t: "", s: "burst" as TextStyle, c: "#ff6b6b" });

  const patch = (i: number, p: Partial<Decor["items"][number]>) =>
    setDecor((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...p } : it)) }));

  function add(id: string, extra: Partial<DecorItem> = {}) {
    setBrush(null);
    if (decor.items.length >= MAX_STICKERS) return setMsg(`스티커는 ${MAX_STICKERS}개까지 붙일 수 있어요.`);
    const items = [...decor.items, { id, x: 30 + Math.random() * 40, y: 30 + Math.random() * 40, r: Math.round(Math.random() * 30 - 15), k: 1, ...extra }];
    setDecor({ ...decor, items });
    setSel(items.length - 1);
  }

  function drag(e: React.PointerEvent, i: number) {
    e.preventDefault();
    setSel(i);
    const box = layer.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) =>
      patch(i, {
        x: Math.min(100, Math.max(0, ((ev.clientX - box.left) / box.width) * 100)),
        y: Math.min(100, Math.max(0, ((ev.clientY - box.top) / box.height) * 100)),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function save() {
    start(async () => {
      const res = await saveDecor(decor);
      if (!res.ok) return setMsg(res.error);
      setSaved(decor);
      setEditing(false);
      setSel(null);
      setBrush(null);
      setMsg("");
    });
  }

  const cur = sel !== null ? decor.items[sel] : null;
  const tool = "inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-white px-2.5 text-sm font-bold ring-1 ring-line hover:bg-well";

  const overlay = (
    <div ref={layer} className={`absolute inset-0 overflow-hidden rounded-[1.6rem] sm:rounded-[2rem] ${editing && brush === null ? "" : "pointer-events-none"}`} onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
      {decor.items.map((it, i) => {
        const s = srcOf(it);
        if (!s) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={s}
            alt=""
            draggable={false}
            onPointerDown={editing ? (e) => drag(e, i) : undefined}
            className={`absolute w-[14%] touch-none select-none drop-shadow-[0_3px_4px_rgba(31,42,38,0.18)] ${editing ? "cursor-grab active:cursor-grabbing" : ""} ${editing && sel === i ? "rounded-xl outline-2 outline-offset-2 outline-dashed outline-ink" : ""}`}
            style={{ left: `${it.x}%`, top: `${it.y}%`, transform: `translate(-50%,-50%) rotate(${it.r}deg) scale(${it.k})` }}
          />
        );
      })}
    </div>
  );

  const toolbar = canEdit ? (
    editing ? (
      <div data-tour="decor" className="card order-last w-full basis-full p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-black">테두리</span>
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.label}
              aria-label={`${t.label} 테두리`}
              aria-pressed={decor.theme === t.key}
              onClick={() => setDecor({ ...decor, theme: t.key })}
              className={`size-8 rounded-full ring-1 ring-line transition-transform ${decor.theme === t.key ? "scale-110 shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--ink)]" : ""}`}
              style={{ backgroundColor: t.color }}
            />
          ))}
          <label
            title="원하는 테두리 색"
            className={`relative size-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-line ${isHex(decor.theme) ? "scale-110 shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--ink)]" : ""}`}
            style={{ background: isHex(decor.theme) ? decor.theme : "conic-gradient(#ff8a8a,#ffd36e,#8be0a4,#7cc4ff,#c39bff,#ff8a8a)" }}
          >
            <span className="sr-only">원하는 테두리 색</span>
            <input
              type="color"
              value={isHex(decor.theme) ? decor.theme : "#ffe3ec"}
              onChange={(e) => setDecor({ ...decor, theme: e.target.value })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        <p className="mt-3 text-sm font-black">
          칸 색 <span className="font-medium text-muted">{brush === null ? "색을 고르고 판의 칸을 눌러 칠해요" : "칸을 눌러 칠해요 · 같은 색을 다시 누르면 지워져요"}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {CELL_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              title={c.label}
              aria-label={`${c.label} 칸 색`}
              aria-pressed={brush === c.key}
              onClick={() => setBrush(brush === c.key ? null : c.key)}
              className={`size-8 rounded-lg ring-1 ring-line transition-transform ${brush === c.key ? "scale-110 shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--ink)]" : ""}`}
              style={{ backgroundColor: c.color }}
            />
          ))}
          <label
            title="원하는 색 고르기"
            className={`relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg ring-1 ring-line ${brush?.startsWith("#") ? "scale-110 shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--ink)]" : ""}`}
            style={{ background: brush?.startsWith("#") ? brush : "conic-gradient(#ff8a8a,#ffd36e,#8be0a4,#7cc4ff,#c39bff,#ff8a8a)" }}
          >
            <span className="sr-only">원하는 색</span>
            <input
              type="color"
              value={brush?.startsWith("#") ? brush : "#ffd6e0"}
              onChange={(e) => setBrush(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <button type="button" aria-pressed={brush === ""} onClick={() => setBrush(brush === "" ? null : "")} className={`${tool} ${brush === "" ? "bg-ink text-white hover:bg-ink" : ""}`}>
            지우개
          </button>
          {brush && (
            <button type="button" className={tool} onClick={() => setDecor({ ...decor, cells: decor.cells.map(() => brush) })}>
              모든 칸에
            </button>
          )}
          {decor.cells.some(Boolean) && (
            <button type="button" className={tool} onClick={() => setDecor({ ...decor, cells: decor.cells.map(() => "") })}>
              모두 지우기
            </button>
          )}
        </div>
        <p className="mt-3 text-sm font-black">
          스티커 <span className="font-medium text-muted">눌러서 붙이고, 판 위에서 끌어 옮겨요 ({decor.items.length}/{MAX_STICKERS})</span>
        </p>
        <div role="tablist" aria-label="스티커 묶음" className="nav-scroll mt-2 flex gap-1 overflow-x-auto border-b border-line">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-bold ${tab === c ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {c}
            </button>
          ))}
        </div>
        {tab === "직접 만들기" ? (
          <div className="mt-3 flex flex-wrap items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={textStickerSrc(txt.t || "글자 입력", txt.s, txt.c)} alt="미리보기" className="size-24 shrink-0 rounded-xl bg-well p-1" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                value={txt.t}
                maxLength={TEXT_MAX}
                onChange={(e) => setTxt({ ...txt, t: e.target.value })}
                placeholder={`넣을 글자 (${TEXT_MAX}자까지)`}
                className="field !py-2 !text-sm"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {TEXT_STYLES.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    aria-pressed={txt.s === st.key}
                    onClick={() => setTxt({ ...txt, s: st.key })}
                    className={`${tool} ${txt.s === st.key ? "bg-ink text-white hover:bg-ink" : ""}`}
                  >
                    {st.label}
                  </button>
                ))}
                <label title="글자 색" className="relative size-9 cursor-pointer overflow-hidden rounded-xl ring-1 ring-line" style={{ backgroundColor: txt.c }}>
                  <span className="sr-only">글자 색</span>
                  <input type="color" value={txt.c} onChange={(e) => setTxt({ ...txt, c: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                </label>
                <button
                  type="button"
                  disabled={!txt.t.trim()}
                  onClick={() => add("t:text", { t: txt.t.trim(), s: txt.s, c: txt.c })}
                  className="btn h-9 rounded-xl bg-green px-4 text-sm text-white hover:bg-mint-deep disabled:opacity-40"
                >
                  붙이기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 grid max-h-52 grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5 overflow-y-auto pr-1">
            {all
              .filter((s) => s.cat === tab)
              .map((s) => (
                <button key={s.id} type="button" title={s.name} onClick={() => add(s.id)} className="aspect-square rounded-xl bg-well p-1.5 transition-transform hover:scale-110">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.name} loading="lazy" className="size-full object-contain" />
                </button>
              ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {cur && sel !== null && (
            <>
              <button type="button" className={tool} onClick={() => patch(sel, { r: Math.max(-180, cur.r - 15) })} aria-label="왼쪽으로 돌리기">↺</button>
              <button type="button" className={tool} onClick={() => patch(sel, { r: Math.min(180, cur.r + 15) })} aria-label="오른쪽으로 돌리기">↻</button>
              <label className="flex items-center gap-1.5 text-xs font-bold text-sub">
                각도
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={Math.round(cur.r)}
                  onChange={(e) => patch(sel, { r: Number(e.target.value) })}
                  className="w-28 accent-[var(--ink)]"
                  aria-label="스티커 각도"
                />
                <span className="w-9 tabular-nums">{Math.round(cur.r)}°</span>
              </label>
              <button type="button" className={tool} onClick={() => patch(sel, { k: Math.max(0.5, cur.k - 0.2) })} aria-label="작게">－</button>
              <button type="button" className={tool} onClick={() => patch(sel, { k: Math.min(2.5, cur.k + 0.2) })} aria-label="크게">＋</button>
              <button
                type="button"
                className={`${tool} text-bad`}
                onClick={() => {
                  setDecor({ ...decor, items: decor.items.filter((_, j) => j !== sel) });
                  setSel(null);
                }}
              >
                떼기
              </button>
            </>
          )}
          <span className="ml-auto flex gap-1.5">
            <button
              type="button"
              className={tool}
              onClick={() => {
                setDecor(saved);
                setEditing(false);
                setBrush(null);
                setSel(null);
                setMsg("");
              }}
            >
              취소
            </button>
            <button type="button" disabled={pending} onClick={save} className="btn h-9 rounded-xl bg-green px-4 text-sm text-white hover:bg-mint-deep disabled:opacity-60">
              {pending ? "저장 중…" : "저장"}
            </button>
          </span>
        </div>
        {msg && <p className="mt-2 text-sm font-bold text-bad">{msg}</p>}
      </div>
    ) : (
      <button
        data-tour="decor"
        type="button"
        onClick={() => setEditing(true)}
        className="btn h-10 gap-1.5 rounded-2xl bg-ink px-4 text-sm text-white hover:bg-[#33413b]"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
          <path d="M13.6 3.2a2 2 0 0 1 2.9 2.9l-9 9-3.8 1 1-3.8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        판 꾸미기
      </button>
    )
  ) : null;

  return (
    <BingoBoard
      {...board}
      frame={themeColor(decor.theme)}
      cellColors={decor.cells.map(cellColor)}
      onPaint={editing && brush !== null ? paint : undefined}
      overlay={overlay}
      toolbar={toolbar}
    />
  );
}
