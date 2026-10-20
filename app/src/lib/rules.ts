// 짝꽁 사업 규칙 상수. 웹·봇·테스트가 함께 쓴다.

export const BOARD_SIZE = 5;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

/** 대면 미션만 놓을 수 있는 칸 (5×5 기준 (2,2)(2,4)(3,3)(4,2)(4,4), 0부터 센 칸 번호) */
export const FACE_POSITIONS: readonly number[] = [6, 8, 12, 16, 18];
export const FACE_COUNT = FACE_POSITIONS.length;
/** 나머지 칸에는 비대면 미션만 놓을 수 있다 */
export const REMOTE_COUNT = CELL_COUNT - FACE_COUNT;

export const TEAM_MIN = 2;
export const TEAM_MAX = 4;

export function isFacePosition(position: number): boolean {
  return FACE_POSITIONS.includes(position);
}

export const COLOR_LABEL = { MINT: "민트", PINK: "핑크" } as const;
export type TeamColorKey = keyof typeof COLOR_LABEL;

export const TYPE_LABEL = { REMOTE: "비대면", FACE: "대면" } as const;
