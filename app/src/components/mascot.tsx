import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * 짝꽁 로고 캐릭터: 서로 기대어 있는 두 친구(민트·핑크). 팀 빙고판 색과 같다.
 * public/mascot.png 가 있으면 그 이미지로 대체되어 서비스 전체에 반영된다.
 */
export function Mascot({ size = 96, className = "" }: { size?: number; className?: string }) {
  if (existsSync(join(process.cwd(), "public", "mascot.png"))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/mascot.png" alt="" width={size} height={size} className={`rounded-full ${className}`} />;
  }
  return <PairMark size={size} className={className} />;
}

/** 코드로 그린 두 친구. 헤더·아이콘·빈 화면에서 크기만 바꿔 쓴다 */
export function PairMark({ size = 96, className = "" }: { size?: number; className?: string }) {
  const ink = "#2b2b2b";
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 132 114" aria-hidden="true" className={className}>
      <ellipse cx="66" cy="108" rx="48" ry="5" fill={ink} opacity="0.12" />

      {/* 핑크 친구 (뒤) */}
      <g transform="rotate(7 88 66)">
        <path d="M88 96 C64 96 56 78 58 62 C60 44 74 34 88 34 C102 34 116 44 118 62 C120 78 112 96 88 96Z" fill="#f7b2c0" stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
        {/* 머리 위 하트 */}
        <path d="M88 33 C78 26 79 17 85 18 C87 18.5 88 20 88 21 C88 20 89 18.5 91 18 C97 17 98 26 88 33Z" fill="#ff7a95" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="79" cy="62" r="3.8" fill={ink} />
        <circle cx="97" cy="62" r="3.8" fill={ink} />
        <circle cx="80.3" cy="60.7" r="1.2" fill="#fff" />
        <circle cx="98.3" cy="60.7" r="1.2" fill="#fff" />
        <ellipse cx="72" cy="72" rx="5.5" ry="3.4" fill="#ee8ca1" />
        <ellipse cx="104" cy="72" rx="5.5" ry="3.4" fill="#ee8ca1" />
        <path d="M84 71 Q88 76 92 71" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* 민트 친구 (앞) */}
      <g transform="rotate(-7 44 66)">
        <path d="M44 96 C20 96 12 78 14 62 C16 44 30 34 44 34 C58 34 72 44 74 62 C76 78 68 96 44 96Z" fill="#8fd3a5" stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
        {/* 머리 위 새싹 */}
        <path d="M44 34 C44 28 44 25 44 22" fill="none" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M44 24 C37 24 30 19 29 12 C37 12 43 16 44 24Z" fill="#5cc084" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M44 24 C51 24 58 19 59 12 C51 12 45 16 44 24Z" fill="#5cc084" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="35" cy="62" r="3.8" fill={ink} />
        <circle cx="53" cy="62" r="3.8" fill={ink} />
        <circle cx="36.3" cy="60.7" r="1.2" fill="#fff" />
        <circle cx="54.3" cy="60.7" r="1.2" fill="#fff" />
        <ellipse cx="28" cy="72" rx="5.5" ry="3.4" fill="#f7b2c0" />
        <ellipse cx="60" cy="72" rx="5.5" ry="3.4" fill="#f7b2c0" />
        <path d="M40 71 Q44 76 48 71" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* 가운데에서 맞잡은 별 (빙고 완성!) */}
      <path
        d="M66 66 L69 72.5 L76 73.4 L70.8 78.2 L72.2 85.2 L66 81.7 L59.8 85.2 L61.2 78.2 L56 73.4 L63 72.5Z"
        fill="#ffd95a"
        stroke={ink}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
