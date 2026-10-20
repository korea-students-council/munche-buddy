import { describe, expect, it } from "vitest";
import { allLines, compareEvaluations, evaluateBoard, maxLines, rankTeams } from "./bingo";
import { drawRaffle } from "./raffle";
import { BOARD_SIZE, CELL_COUNT, FACE_POSITIONS, REMOTE_COUNT, isFacePosition } from "./rules";
import { fromKstInput, kstDay, remaining, toKstInput } from "./time";

const T = new Date("2026-10-01T00:00:00Z");

/** n×n 판에서 positions를 채운다. face에 든 칸은 대면 미션 */
function board(n: number, filledPositions: number[], face: number[] = []) {
  return Array.from({ length: n * n }, (_, p) => ({
    position: p,
    isFace: face.includes(p),
    filledAt: filledPositions.includes(p) ? T : null,
  }));
}

describe("규칙 상수", () => {
  it("대면 칸은 5×5 기준 (2,2)(2,4)(3,3)(4,2)(4,4)", () => {
    const oneBased = FACE_POSITIONS.map((p) => [Math.floor(p / BOARD_SIZE) + 1, (p % BOARD_SIZE) + 1]);
    expect(oneBased).toEqual([
      [2, 2],
      [2, 4],
      [3, 3],
      [4, 2],
      [4, 4],
    ]);
    expect(CELL_COUNT).toBe(25);
    expect(REMOTE_COUNT).toBe(20);
    expect(isFacePosition(12)).toBe(true);
    expect(isFacePosition(0)).toBe(false);
  });
});

describe("allLines", () => {
  it("3x3은 8줄, 5x5는 12줄", () => {
    expect(allLines(3)).toHaveLength(8);
    expect(allLines(5)).toHaveLength(12);
    expect(maxLines(5)).toBe(12);
  });
});

describe("evaluateBoard", () => {
  it("한 줄 완성을 센다", () => {
    const e = evaluateBoard(3, board(3, [0, 1, 2]));
    expect(e.lines).toBe(1);
    expect(e.filled).toBe(3);
  });

  it("가로+세로+대각선+반대 대각선을 모두 센다", () => {
    const e = evaluateBoard(3, board(3, [0, 4, 8, 1, 2, 3, 6]));
    expect(e.lines).toBe(4);
  });

  it("채운 칸 중 대면 미션 수를 센다", () => {
    const e = evaluateBoard(5, board(5, [6, 8, 0, 1], [6, 8, 12]));
    expect(e.filled).toBe(4);
    expect(e.faceCount).toBe(2);
  });

  it("비어 있는 판은 모두 0", () => {
    const e = evaluateBoard(5, board(5, []));
    expect([e.lines, e.filled, e.faceCount]).toEqual([0, 0, 0]);
  });
});

describe("순위 (줄 수 → 채운 칸 → 대면 수)", () => {
  const team = (id: string, n: number, filled: number[], face: number[] = []) => ({
    id,
    ...evaluateBoard(n, board(n, filled, face)),
  });

  it("빙고 줄이 많은 팀이 앞선다", () => {
    const r = rankTeams([team("a", 3, [0, 1]), team("b", 3, [0, 1, 2])]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("줄 수가 같으면 채운 칸이 많은 팀이 앞선다", () => {
    const r = rankTeams([team("a", 3, [0, 1, 2]), team("b", 3, [0, 1, 2, 4])]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("줄·칸 수가 같으면 대면 미션을 더 많이 한 팀이 앞선다", () => {
    const a = team("a", 3, [0, 1, 2, 4], []);
    const b = team("b", 3, [0, 1, 2, 4], [4, 0]);
    const r = rankTeams([a, b]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2]);
  });

  it("세 기준이 모두 같으면 공동 순위", () => {
    const a = team("a", 3, [0, 1, 2]);
    const b = team("b", 3, [0, 1, 2]);
    const c = team("c", 3, [0]);
    expect(compareEvaluations(a, b)).toBe(0);
    expect(rankTeams([a, b, c]).map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it("인증 시각은 순위에 영향을 주지 않는다", () => {
    const early = { id: "early", ...evaluateBoard(3, [0, 1, 2].map((p) => ({ position: p, isFace: false, filledAt: new Date(1000) }))) };
    const late = { id: "late", ...evaluateBoard(3, [0, 1, 2].map((p) => ({ position: p, isFace: false, filledAt: new Date(9_999_999) }))) };
    expect(rankTeams([late, early]).map((x) => x.rank)).toEqual([1, 1]);
  });
});

describe("추첨 (채운 칸 수만큼 쪽지)", () => {
  const entries = [
    { id: "a", tickets: 1 },
    { id: "b", tickets: 3 },
    { id: "c", tickets: 0 },
  ];

  it("쪽지 수에 비례해 뽑히고, 쪽지 0장은 절대 뽑히지 않는다", () => {
    // 전체 4장: [0]→a, [1,2,3]→b
    const at = (v: number) => drawRaffle(entries, () => v)!.id;
    expect(at(0)).toBe("a");
    expect(at(0.25)).toBe("b");
    expect(at(0.99)).toBe("b");
  });

  it("쪽지가 하나도 없으면 null", () => {
    expect(drawRaffle([{ id: "x", tickets: 0 }])).toBeNull();
    expect(drawRaffle([])).toBeNull();
  });

  it("무작위로 많이 뽑으면 쪽지 비율과 비슷해진다", () => {
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) counts[drawRaffle(entries)!.id]++;
    expect(counts.b / counts.a).toBeGreaterThan(2.3);
    expect(counts.b / counts.a).toBeLessThan(3.9);
  });
});

describe("시간 변환 (KST)", () => {
  it("UTC 15:00은 KST 다음날 00:00", () => {
    const d = new Date("2026-10-19T15:00:00Z");
    expect(kstDay(d)).toBe("2026-10-20");
    expect(toKstInput(d)).toBe("2026-10-20T00:00");
  });

  it("입력값 왕복 변환이 일치한다", () => {
    const d = fromKstInput("2026-10-20T23:59");
    expect(d?.toISOString()).toBe("2026-10-20T14:59:00.000Z");
    expect(toKstInput(d)).toBe("2026-10-20T23:59");
  });

  it("잘못된 형식은 null", () => {
    expect(fromKstInput("2026-10-20")).toBeNull();
    expect(fromKstInput("")).toBeNull();
  });

  it("남은 시간 표기", () => {
    const now = new Date("2026-10-20T00:00:00Z");
    expect(remaining(new Date(now.getTime() + 50 * 60_000), now)).toBe("50분");
    expect(remaining(new Date(now.getTime() + 5 * 3600_000 + 20 * 60_000), now)).toBe("5시간 20분");
    expect(remaining(new Date(now.getTime() + 2 * 86400_000 + 3 * 3600_000), now)).toBe("2일 3시간");
  });
});
