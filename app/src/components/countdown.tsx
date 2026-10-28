"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** target(ISO 문자열)까지 1초마다 줄어드는 시계. 하루 이상 남으면 "2일 03:12:09" */
export function Countdown({ target }: { target: string }) {
  const end = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 서버 렌더와 첫 화면이 어긋나지 않도록 마운트 전에는 자리만 잡아 둔다
  if (now === null) return <span className="tabular-nums">--:--:--</span>;
  const ms = Math.max(0, end - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {d > 0 && `${d}일 `}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
