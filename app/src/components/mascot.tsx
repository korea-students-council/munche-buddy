import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 마스코트. public/mascot.png 가 있으면 그 이미지를, 없으면 임시 일러스트를 보여준다.
 * 사용 권한이 확인된 마스코트 이미지를 public/mascot.png 로 넣으면 서비스 전체에 반영된다.
 */
export function Mascot({ size = 96, className = "" }: { size?: number; className?: string }) {
  if (existsSync(join(process.cwd(), "public", "mascot.png"))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/mascot.png" alt="" width={size} height={size} className={`rounded-full ${className}`} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="#2b2b2b" opacity="0.12" />
      {/* 귀 */}
      <ellipse cx="34" cy="38" rx="13" ry="17" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
      <ellipse cx="35" cy="40" rx="6" ry="10" fill="#bfe3f2" />
      <ellipse cx="86" cy="38" rx="13" ry="17" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
      <ellipse cx="85" cy="40" rx="6" ry="10" fill="#bfe3f2" />
      {/* 몸 */}
      <ellipse cx="60" cy="72" rx="40" ry="36" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
      {/* 모자 */}
      <path d="M24 52 C24 28 96 28 96 52 C80 46 40 46 24 52Z" fill="#fff3bd" stroke="#2b2b2b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 34 C52 28 68 28 76 34" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" />
      {/* 얼굴 */}
      <circle cx="44" cy="68" r="5" fill="#2b2b2b" />
      <circle cx="76" cy="68" r="5" fill="#2b2b2b" />
      <circle cx="45.5" cy="66.5" r="1.6" fill="#fff" />
      <circle cx="77.5" cy="66.5" r="1.6" fill="#fff" />
      <ellipse cx="35" cy="78" rx="8" ry="5" fill="#f7b2c0" />
      <ellipse cx="85" cy="78" rx="8" ry="5" fill="#f7b2c0" />
      <path d="M55 79 Q60 85 65 79" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
