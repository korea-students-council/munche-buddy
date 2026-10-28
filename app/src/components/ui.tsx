import Link from "next/link";
import type { ReactNode } from "react";
import { Mascot } from "./mascot";

export { btn, inputCls } from "./styles";
import { btn } from "./styles";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 sm:p-6 ${className}`}>{children}</section>;
}

type Tone = "mint" | "pink" | "sky" | "sun" | "good" | "bad" | "gray" | "ink";
const TONES: Record<Tone, string> = {
  mint: "bg-sky-soft text-ink",
  pink: "bg-cocoa-soft text-ink",
  sky: "bg-sky-soft text-ink",
  sun: "bg-sky text-ink",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  gray: "bg-well text-sub",
  ink: "bg-ink text-white",
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
      <div>
        {desc && <p className="text-sm text-muted">{desc}</p>}
        <h1 className="mt-0.5 text-[1.75rem] font-black leading-tight tracking-[-0.04em] sm:text-[2rem]">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Notice({ tone = "mint", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="status" className={`mb-4 rounded-2xl px-4 py-3 text-sm font-bold ${TONES[tone]}`}>
      {children}
    </div>
  );
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full bg-sky-soft" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-sky font-black"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
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
    <div className="card flex flex-col items-center px-6 py-12 text-center text-sm text-muted">
      <Mascot size={120} className="mb-4" />
      <div className="max-w-md">{children}</div>
      {href && cta && (
        <Link href={href} className={`${btn.primary} mt-6`}>
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

/** 작은 숫자 타일 (순위·빙고·칸·대면) */
export function StatCard({ label, value, sub, bg = "bg-well" }: { label: string; value: string; sub?: string; bg?: string }) {
  return (
    <div className={`rounded-[1.1rem] px-1 py-3 text-center ${bg}`}>
      <p className="text-[11px] text-sub sm:text-xs">{label}</p>
      <p className="text-lg font-black leading-tight tracking-[-0.03em] sm:text-2xl">{value}</p>
      {sub && <p className="text-[10px] text-muted sm:text-xs">{sub}</p>}
    </div>
  );
}

/** 진행 막대 */
export function Progress({ value, max, tone = "sky" }: { value: number; max: number; tone?: "sky" | "ink" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[#edf2f5]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full ${tone === "ink" ? "bg-ink" : "bg-sky"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 밑줄 강조 링크 (카드 오른쪽 위 "판 보기", "전체 보기" 같은 것) */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="py-1 text-sm font-bold underline decoration-sky decoration-[3px] underline-offset-[5px] hover:decoration-ink">
      {children}
    </Link>
  );
}
