import Link from "next/link";
import type { ReactNode } from "react";
import { Mascot } from "./mascot";

export { btn, inputCls } from "./styles";
import { btn } from "./styles";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

type Tone = "mint" | "pink" | "sky" | "sun" | "good" | "bad" | "gray";
const TONES: Record<Tone, string> = {
  mint: "bg-mint-soft text-ink border-ink/70",
  pink: "bg-pink-soft text-ink border-ink/70",
  sky: "bg-sky-soft text-ink border-ink/70",
  sun: "bg-sun-soft text-ink border-ink/70",
  good: "bg-good-soft text-good border-good/60",
  bad: "bg-bad-soft text-bad border-bad/60",
  gray: "bg-white text-muted border-line",
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl leading-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ tone = "mint", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="status" className={`mb-4 rounded-2xl border-2 px-4 py-3 text-sm font-bold ${TONES[tone]}`}>
      {children}
    </div>
  );
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full border-2 border-ink bg-white" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border-2 border-ink bg-sun font-display"
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function EmptyState({
  children,
  href,
  cta,
}: {
  children: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center text-sm text-muted">
      <Mascot size={88} className="bob mb-3" />
      <div className="max-w-md">{children}</div>
      {href && cta && (
        <Link href={href} className={`${btn.primary} mt-5`}>
          {cta}
        </Link>
      )}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** 빙고판 한 칸 */
export type GridCell = {
  position: number;
  number: number | null;
  title: string | null;
  filled: boolean;
  inLine: boolean;
  /** 대면 미션 전용 칸 */
  face: boolean;
};

const FILL = { MINT: "bg-mint", PINK: "bg-pink" } as const;

export function BingoGrid({
  n,
  cells,
  color = "MINT",
}: {
  n: number;
  cells: GridCell[];
  color?: keyof typeof FILL;
}) {
  return (
    <div
      className="mx-auto grid w-full max-w-xl gap-1.5 sm:gap-2.5"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`${n}×${n} 빙고판`}
    >
      {cells.map((c) => (
        <div
          key={c.position}
          role="gridcell"
          title={c.title ?? undefined}
          className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-ink p-0.5 text-center leading-tight sm:rounded-2xl sm:p-1.5 ${
            c.filled ? `${FILL[color]} ${c.inLine ? "shadow-[2px_2px_0_0_var(--ink)]" : ""}` : c.face ? "border-dashed bg-sun-soft" : "bg-white"
          }`}
        >
          {c.number !== null && (
            <span className="font-display text-base leading-none sm:text-xl">{c.number}</span>
          )}
          <span className="mt-0.5 line-clamp-3 break-words text-[9px] font-bold leading-[1.15] sm:text-[11px]">{c.title ?? ""}</span>
          {c.face && !c.filled && (
            <span className="absolute left-0.5 top-0.5 text-[9px] sm:left-1 sm:top-1 sm:text-xs" aria-label="대면 미션 칸">
              ★
            </span>
          )}
          {c.filled && (
            <span aria-label="인증 완료" className="stamp absolute right-0.5 top-0 text-sm font-black sm:right-1 sm:top-0.5 sm:text-lg">
              ✓
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
