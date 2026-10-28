import Link from "next/link";
import { PairMark } from "./mascot";

/** 헤더 로고: 겹친 두 원 + "짝꽁빙고" */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="짝꽁빙고 홈">
      <PairMark size={40} />
      <span className="text-xl font-black leading-none tracking-[-0.05em]">짝꽁빙고</span>
    </Link>
  );
}
