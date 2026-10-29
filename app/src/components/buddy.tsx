"use client";

import { useEffect, useRef, useState } from "react";
import { PAIR_RATIO, PAIR_VIEWBOX, PairArt } from "./pair-art";

/** 짝꽁 두 친구. 가끔 눈을 깜빡이고, 누르면 활짝 웃으며 콩 뛴다 */
export function Buddy({ size = 96, fluid = false, className = "" }: { size?: number; fluid?: boolean; className?: string }) {
  const [blink, setBlink] = useState(false);
  const [happy, setHappy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3800);
    return () => {
      clearInterval(id);
      clearTimeout(timer.current);
    };
  }, []);

  function poke() {
    setHappy(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHappy(false), 1400);
  }

  return (
    <button type="button" onClick={poke} aria-label="짝꽁이 쓰다듬기" className={`shrink-0 cursor-pointer ${fluid ? "block w-full" : ""} ${className}`}>
      <svg
        width={fluid ? undefined : size}
        height={fluid ? undefined : size * PAIR_RATIO}
        viewBox={PAIR_VIEWBOX}
        aria-hidden="true"
        className={`block transition-transform duration-500 [transition-timing-function:var(--spring)] ${fluid ? "h-auto w-full" : ""}`}
        style={{ transform: happy ? "translateY(-8%)" : undefined }}
      >
        <PairArt eye={blink ? 0.8 : 4.5} smile={happy} />
      </svg>
    </button>
  );
}
