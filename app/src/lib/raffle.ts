// 추첨: 채운 칸 수만큼 쪽지를 받는 가중 무작위 뽑기.

export type RaffleEntry = { id: string; tickets: number };

/** 쪽지(가중치) 수에 비례해 한 팀을 뽑는다. 쪽지가 하나도 없으면 null. rand는 [0,1) */
export function drawRaffle(entries: RaffleEntry[], rand: () => number = Math.random): RaffleEntry | null {
  const pool = entries.filter((e) => e.tickets > 0);
  const total = pool.reduce((sum, e) => sum + e.tickets, 0);
  if (total === 0) return null;
  let pick = Math.floor(rand() * total);
  for (const e of pool) {
    if (pick < e.tickets) return e;
    pick -= e.tickets;
  }
  return pool[pool.length - 1];
}
