import { existsSync } from "node:fs";
import { join } from "node:path";
import { Buddy } from "./buddy";
import { PAIR_RATIO, PAIR_VIEWBOX, PairArt } from "./pair-art";

/**
 * 짝꽁 캐릭터: 로고의 두 친구(새싹 달린 민트 + 핑크).
 * public/mascot.png 가 있으면 그 이미지로 대체되어 서비스 전체에 반영된다.
 */
export function Mascot({ size = 96, fluid = false, className = "" }: { size?: number; fluid?: boolean; className?: string }) {
  if (existsSync(join(process.cwd(), "public", "mascot.png"))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/mascot.png" alt="" width={size} height={size} className={`rounded-full ${fluid ? "h-auto w-full" : ""} ${className}`} />;
  }
  return <Buddy size={size} fluid={fluid} className={className} />;
}

/** 로고 마크: 두 친구 그림 */
export function PairMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * PAIR_RATIO} viewBox={PAIR_VIEWBOX} aria-hidden="true" className={className}>
      <PairArt />
    </svg>
  );
}
