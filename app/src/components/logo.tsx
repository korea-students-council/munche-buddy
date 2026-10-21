import Link from "next/link";
import { PairMark } from "./mascot";

/** 헤더 로고: 두 친구 + "짝꽁 빙고" 글자 */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="짝꽁 빙고 홈">
      <PairMark size={44} />
      <span className="flex items-center font-display text-[1.7rem] leading-none">
        짝꽁
        <span className="ml-1.5 inline-block -rotate-3 rounded-lg border-2 border-ink bg-sun px-1.5 pb-0.5 shadow-[2px_2px_0_0_var(--ink)]">빙고</span>
      </span>
    </Link>
  );
}
