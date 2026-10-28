"use client";

import { useEffect, useRef, useState } from "react";

/** 얼굴이 있는 로고 캐릭터. 가끔 눈을 깜빡이고, 누르면 웃는다 */
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

  const ry = blink || happy ? 0.6 : 2.6;
  return (
    <button type="button" onClick={poke} aria-label="짝꽁이 쓰다듬기" className={`shrink-0 cursor-pointer ${fluid ? "block w-full" : ""} ${className}`}>
      <svg
        width={fluid ? undefined : size}
        height={fluid ? undefined : (size * 52) / 78}
        viewBox="0 0 78 52"
        aria-hidden="true"
        className={`block transition-transform duration-500 [transition-timing-function:var(--spring)] ${fluid ? "h-auto w-full" : ""}`}
        style={{ transform: happy ? "translateY(-6%) rotate(-6deg)" : undefined }}
      >
        <circle cx="26" cy="26" r="24" fill="#301D15" />
        <circle cx="52" cy="26" r="24" fill="#FFFFFF" stroke="#BDDBEF" strokeWidth="3" />
        <ellipse cx="20" cy="24" rx="2" ry={ry} fill="#FFFFFF" />
        <ellipse cx="31" cy="24" rx="2" ry={ry} fill="#FFFFFF" />
        <ellipse cx="47" cy="24" rx="2" ry={ry} fill="#301D15" />
        <ellipse cx="58" cy="24" rx="2" ry={ry} fill="#301D15" />
        <ellipse cx="13" cy="31" rx="3" ry="1.8" fill="#BDDBEF" opacity="0.55" />
        <ellipse cx="65" cy="31" rx="3" ry="1.8" fill="#BDDBEF" />
        <path d={happy ? "M21 31 Q25.5 36 30 31" : "M22.5 32 Q25.5 34.5 28.5 32"} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        <path d={happy ? "M48 31 Q52.5 36 57 31" : "M49.5 32 Q52.5 34.5 55.5 32"} fill="none" stroke="#301D15" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
