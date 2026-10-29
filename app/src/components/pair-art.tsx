/** 짝꽁 두 친구 그림 (새싹 달린 민트 + 핑크). 로고·캐릭터가 함께 쓴다 */

export const PAIR_VIEWBOX = "8 6 116 96";
export const PAIR_RATIO = 96 / 116;

const MINT_BODY = "M44 96 C20 96 12 78 14 62 C16 44 30 34 44 34 C58 34 72 44 74 62 C76 78 68 96 44 96Z";
const PINK_BODY = "M88 96 C64 96 56 78 58 62 C60 44 74 34 88 34 C102 34 116 44 118 62 C120 78 112 96 88 96Z";

/** eye: 눈 세로 반지름 (깜빡일 때 작아진다), smile: 입꼬리를 더 올린다 */
export function PairArt({ eye = 4.5, smile = false }: { eye?: number; smile?: boolean }) {
  const mouth = (x: number) => (smile ? `M${x - 6} 70 Q${x} 78 ${x + 6} 70` : `M${x - 4} 71 Q${x} 75 ${x + 4} 71`);
  return (
    <>
      <g transform="rotate(7 88 66)">
        <path d={PINK_BODY} fill="#F6A6BB" />
        <ellipse cx="80" cy="62" rx="4.5" ry={eye} fill="#1F2A26" />
        <ellipse cx="96" cy="62" rx="4.5" ry={eye} fill="#1F2A26" />
        <ellipse cx="74" cy="72" rx="5" ry="3" fill="#EE8CA3" />
        <path d={mouth(88)} fill="none" stroke="#1F2A26" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(-7 44 66)">
        <path d={MINT_BODY} fill="#7FD6A6" />
        <path d="M44 34 C44 28 44 25 44 22" fill="none" stroke="#2F7A55" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M44 24 C37 24 30 19 29 12 C37 12 43 16 44 24Z" fill="#4FB37E" />
        <path d="M44 24 C51 24 58 19 59 12 C51 12 45 16 44 24Z" fill="#4FB37E" />
        <ellipse cx="36" cy="62" rx="4.5" ry={eye} fill="#1F2A26" />
        <ellipse cx="52" cy="62" rx="4.5" ry={eye} fill="#1F2A26" />
        <ellipse cx="30" cy="72" rx="5" ry="3" fill="#F6A6BB" />
        <path d={mouth(44)} fill="none" stroke="#1F2A26" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </>
  );
}
