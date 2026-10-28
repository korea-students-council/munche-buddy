import { existsSync } from "node:fs";
import { join } from "node:path";
import { Buddy } from "./buddy";

/**
 * 짝꽁 캐릭터: 로고의 겹친 두 원(코코아·하늘)에 얼굴을 그린 것.
 * public/mascot.png 가 있으면 그 이미지로 대체되어 서비스 전체에 반영된다.
 */
export function Mascot({ size = 96, fluid = false, className = "" }: { size?: number; fluid?: boolean; className?: string }) {
  if (existsSync(join(process.cwd(), "public", "mascot.png"))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/mascot.png" alt="" width={size} height={size} className={`rounded-full ${fluid ? "h-auto w-full" : ""} ${className}`} />;
  }
  return <Buddy size={size} fluid={fluid} className={className} />;
}

/** 로고 4 마크: 겹친 두 원. 바탕색과 같은 테두리로 두 원을 갈라 준다 */
export function PairMark({ size = 40, gap = "var(--bg)", className = "" }: { size?: number; gap?: string; className?: string }) {
  return (
    <svg width={size} height={(size * 52) / 78} viewBox="0 0 78 52" aria-hidden="true" className={className}>
      <circle cx="26" cy="26" r="24" fill="#301D15" />
      <circle cx="52" cy="26" r="24" fill="#BDDBEF" stroke={gap} strokeWidth="4" />
    </svg>
  );
}
