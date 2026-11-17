// 클라이언트 컴포넌트에서도 쓰는 작은 UI (ui.tsx는 서버 전용 마스코트를 불러서 따로 둔다)
import type { ReactNode } from "react";

export type Tone = "mint" | "pink" | "sun" | "good" | "bad" | "gray" | "ink";
export const TONES: Record<Tone, string> = {
  mint: "bg-mint-soft text-mint-deep",
  pink: "bg-pink-soft text-pink-deep",
  sun: "bg-sun-soft text-sun-deep",
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

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-full bg-mint-soft" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-pink-soft font-black text-pink-deep"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

