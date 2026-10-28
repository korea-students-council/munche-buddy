"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btn, inputCls } from "@/components/styles";
import { CELL_COUNT, COLOR_LABEL, FACE_COUNT, REMOTE_COUNT, isFacePosition, type TeamColorKey } from "@/lib/rules";
import { saveTeamBoard } from "./actions";

type PoolMission = {
  id: string;
  number: number;
  title: string;
  description: string;
  type: "REMOTE" | "FACE";
  requirePhoto: boolean;
};

const FILL: Record<TeamColorKey, string> = { MINT: "bg-sky", PINK: "bg-mocha" };

export function BoardEditor({
  n,
  pool,
  initial,
  initialName,
  initialColor,
  alreadySubmitted,
}: {
  n: number;
  pool: PoolMission[];
  initial: (string | null)[];
  initialName: string;
  initialColor: TeamColorKey;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [cells, setCells] = useState<(string | null)[]>(initial);
  const [held, setHeld] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<TeamColorKey>(initialColor);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const byId = new Map(pool.map((m) => [m.id, m]));
  const placed = new Set(cells.filter((c): c is string => c !== null));
  const filledCount = placed.size;
  const heldMission = held ? byId.get(held) : null;
  const nameOk = name.trim().length >= 1 && name.trim().length <= 20;

  function clickCell(pos: number) {
    setMsg(null);
    const current = cells[pos];
    if (held) {
      const m = byId.get(held)!;
      if (isFacePosition(pos) && m.type !== "FACE") {
        setMsg({ tone: "bad", text: `대면 칸에는 대면 미션만 놓을 수 있어요. (${m.number}번은 비대면 미션)` });
        return;
      }
      if (!isFacePosition(pos) && m.type !== "REMOTE") {
        setMsg({ tone: "bad", text: `대면 미션은 대면 칸에만 놓을 수 있어요. (${m.number}번은 대면 미션)` });
        return;
      }
      const next = cells.map((c) => (c === held ? null : c)); // 다른 칸에 있던 같은 미션은 이동
      next[pos] = held;
      setCells(next);
      setHeld(current && current !== held ? current : null); // 밀려난 미션을 바로 들고 있게 해 자리 바꾸기 쉽게
    } else if (current) {
      const next = [...cells];
      next[pos] = null;
      setCells(next);
      setHeld(current);
    }
  }

  function pick(id: string) {
    setMsg(null);
    setHeld((h) => (h === id ? null : id));
  }

  function randomFill() {
    setMsg(null);
    const shuffle = (a: string[]) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const freeFace = shuffle(pool.filter((m) => m.type === "FACE" && !placed.has(m.id)).map((m) => m.id));
    const freeRemote = shuffle(pool.filter((m) => m.type === "REMOTE" && !placed.has(m.id)).map((m) => m.id));
    setCells(cells.map((c, pos) => c ?? (isFacePosition(pos) ? freeFace.pop() : freeRemote.pop()) ?? null));
    setHeld(null);
  }

  function clearAll() {
    setCells(Array(CELL_COUNT).fill(null));
    setHeld(null);
    setMsg(null);
  }

  function submit() {
    start(async () => {
      const res = await saveTeamBoard({ name, color, cells });
      if (res.ok) {
        setMsg({ tone: "good", text: "빙고판을 저장했어요! 시즌이 시작되기 전까지는 팀원 누구나 수정할 수 있어요." });
        router.refresh();
      } else {
        setMsg({ tone: "bad", text: res.error });
      }
    });
  }

  const face = pool.filter((m) => m.type === "FACE");
  const remote = pool.filter((m) => m.type === "REMOTE");
  const placedFace = cells.filter((c, p) => c && isFacePosition(p)).length;
  const placedRemote = filledCount - placedFace;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
      <div>
        {/* 팀명 · 색 */}
        <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">팀명</span>
            <input
              className={inputCls}
              value={name}
              maxLength={20}
              placeholder="예) 반짝반짝 짝꽁"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">빙고판 색</legend>
            <div className="flex gap-1 rounded-2xl bg-[#e6ecf0] p-1">
              {(Object.keys(COLOR_LABEL) as TeamColorKey[]).map((c) => (
                <label
                  key={c}
                  className={`flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${color === c ? "bg-white shadow-[0_2px_6px_rgba(48,29,21,0.08)]" : "text-muted"}`}
                >
                  <input type="radio" name="color" className="sr-only" checked={color === c} onChange={() => setColor(c)} />
                  <span className={`size-4 rounded-full ${FILL[c]}`} aria-hidden="true" />
                  {COLOR_LABEL[c]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* 판 */}
        <div
          className="grid gap-1.5 rounded-[1.6rem] bg-white p-2 sm:gap-2.5 sm:rounded-[2rem] sm:p-3.5"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="빙고판 편집"
        >
          {cells.map((id, pos) => {
            const m = id ? byId.get(id) : null;
            const isFace = isFacePosition(pos);
            const canDrop = heldMission ? (isFace ? heldMission.type === "FACE" : heldMission.type === "REMOTE") : false;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => clickCell(pos)}
                aria-label={m ? `${m.number}번 ${m.title}` : isFace ? "대면 미션 칸 (비어 있음)" : "비대면 미션 칸 (비어 있음)"}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl p-1 text-center leading-tight transition-[transform,background-color,box-shadow] duration-300 [transition-timing-function:var(--spring)] hover:scale-[1.03] sm:rounded-[1.2rem] sm:p-2 ${
                  m ? FILL[color] : isFace ? "bg-cocoa-soft" : "bg-well"
                } ${canDrop && !m ? "shadow-[inset_0_0_0_2px_var(--ink)]" : isFace && !m ? "shadow-[inset_0_0_0_1.5px_rgba(48,29,21,0.28)]" : ""}`}
              >
                {isFace && (
                  <span className="absolute left-1 top-1 rounded-full bg-white px-1 text-[8px] font-bold sm:left-1.5 sm:top-1.5 sm:px-1.5 sm:text-[10px]">대면</span>
                )}
                {m ? (
                  <>
                    <span className="text-base font-black leading-none tracking-[-0.02em] sm:text-xl">{m.number}</span>
                    <span className="mt-0.5 line-clamp-2 break-words text-[9px] font-medium leading-[1.2] sm:text-xs">{m.title}</span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-muted sm:text-sm">{canDrop ? "여기!" : "+"}</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 min-h-10 text-sm text-muted" aria-live="polite">
          {heldMission
            ? `${heldMission.number}번 "${heldMission.title}" 을(를) 놓을 ${heldMission.type === "FACE" ? "대면 칸" : "일반 칸"}을 눌러주세요.`
            : "미션을 누른 뒤 놓을 칸을 누르세요. 놓은 칸을 다시 누르면 집어서 옮길 수 있어요."}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={btn.primary} onClick={submit} disabled={pending || filledCount !== CELL_COUNT || !nameOk}>
            {pending ? "저장 중..." : alreadySubmitted ? "수정 내용 저장" : "빙고판 제출"}
          </button>
          <button type="button" className={btn.secondary} onClick={randomFill} disabled={filledCount === CELL_COUNT}>
            남은 칸 무작위로
          </button>
          <button type="button" className={btn.secondary} onClick={clearAll} disabled={filledCount === 0}>
            모두 비우기
          </button>
          <span className="ml-auto text-sm font-bold">
            대면 {placedFace}/{FACE_COUNT} · 일반 {placedRemote}/{REMOTE_COUNT}
          </span>
        </div>
        {!nameOk && filledCount === CELL_COUNT && <p className="mt-2 text-xs font-bold text-bad">팀명을 입력해야 제출할 수 있어요.</p>}
        {msg && (
          <p
            role="status"
            className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold ${msg.tone === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* 미션 풀 */}
      <div>
        <PoolSection title={`대면 미션 (대면 칸 ${FACE_COUNT}개)`} tone="face" missions={face} placed={placed} held={held} onPick={pick} />
        <PoolSection title={`비대면 미션 (일반 칸 ${REMOTE_COUNT}개)`} tone="remote" missions={remote} placed={placed} held={held} onPick={pick} />
      </div>
    </div>
  );
}

function PoolSection({
  title,
  tone,
  missions,
  placed,
  held,
  onPick,
}: {
  title: string;
  tone: "face" | "remote";
  missions: PoolMission[];
  placed: Set<string>;
  held: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <section className="card mb-5 p-4">
      <h2 className={`mb-3 inline-block rounded-full px-3 py-1 text-[13px] font-bold ${tone === "face" ? "bg-cocoa-soft" : "bg-sky-soft"}`}>
        {title} · {missions.length}개
      </h2>
      <ul className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
        {missions.map((m) => {
          const used = placed.has(m.id);
          const isHeld = held === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onPick(m.id)}
                aria-pressed={isHeld}
                className={`flex w-full items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isHeld ? "bg-ink text-white" : used ? "bg-transparent text-muted" : "bg-well hover:bg-sky-soft"
                }`}
              >
                <span className="text-lg font-black leading-none">{m.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-bold">{m.title}</span>
                  {used && !isHeld && <span className="ml-2 text-xs">배치됨</span>}
                  {!m.requirePhoto && <span className="ml-2 rounded-full bg-sky px-1.5 py-0.5 text-[10px] font-bold text-ink">사진 선택</span>}
                  {m.description && <span className={`mt-0.5 block text-xs ${isHeld ? "text-white/70" : "text-muted"}`}>{m.description}</span>}
                </span>
              </button>
            </li>
          );
        })}
        {missions.length === 0 && <li className="text-sm text-muted">아직 등록된 미션이 없어요.</li>}
      </ul>
    </section>
  );
}
