// 빙고 판정과 순위 계산. DB·프레임워크에 의존하지 않는 순수 함수만 둔다.

export type CellFill = {
  position: number;
  /** 대면 미션 칸인가 */
  isFace: boolean;
  /** 인정된 인증 중 가장 이른 시각. 비어 있으면 null */
  filledAt: Date | null;
};

export type BoardEvaluation = {
  /** 완성된 빙고 줄 수 */
  lines: number;
  /** 채운 칸 수 */
  filled: number;
  /** 채운 칸 중 대면 미션 수 */
  faceCount: number;
  /** allLines(n) 기준으로 완성된 줄의 인덱스 */
  completedLines: number[];
};

/** 가로 n + 세로 n + 대각선 2 */
export function allLines(n: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < n; r++) {
    lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  }
  for (let c = 0; c < n; c++) {
    lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  }
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return lines;
}

export function maxLines(n: number): number {
  return 2 * n + 2;
}

export function evaluateBoard(n: number, cells: CellFill[]): BoardEvaluation {
  const filledCells = cells.filter((c) => c.filledAt !== null);
  const filledSet = new Set(filledCells.map((c) => c.position));
  const completedLines: number[] = [];
  allLines(n).forEach((line, i) => {
    if (line.every((p) => filledSet.has(p))) completedLines.push(i);
  });
  return {
    lines: completedLines.length,
    filled: filledCells.length,
    faceCount: filledCells.filter((c) => c.isFace).length,
    completedLines,
  };
}

/**
 * 시상 기준 비교: 빙고 줄 수 ↓ → 채운 칸 수 ↓ → 대면 미션 수 ↓
 * 음수면 a가 더 높은 순위, 0이면 동점.
 */
export function compareEvaluations(a: BoardEvaluation, b: BoardEvaluation): number {
  if (a.lines !== b.lines) return b.lines - a.lines;
  if (a.filled !== b.filled) return b.filled - a.filled;
  return b.faceCount - a.faceCount;
}

/** 세 기준이 모두 같으면 같은 순위(1, 1, 3 …)를 준다. 입력 순서는 안정 정렬로 유지 */
export function rankTeams<T extends BoardEvaluation>(teams: T[]): (T & { rank: number })[] {
  const sorted = [...teams].sort(compareEvaluations);
  const result: (T & { rank: number })[] = [];
  sorted.forEach((t, i) => {
    const prev = result[i - 1];
    const rank = prev && compareEvaluations(prev, t) === 0 ? prev.rank : i + 1;
    result.push({ ...t, rank });
  });
  return result;
}
