"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardBox, ONBOARDING_COUNT } from "./onboarding-card";

/*
 * 처음 들어온 사람에게 카드뉴스 온보딩을 띄운다. 한 번 닫으면 이 브라우저에서는 다시 뜨지 않고,
 * 이용 방법 페이지의 "카드로 보기" 버튼(openOnboarding)으로 언제든 다시 볼 수 있다.
 */

const SEEN_KEY = "jk_onboarding_v1";
const OPEN_EVENT = "jk:open-onboarding";

export function openOnboarding() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function OnboardingGate({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // 저장소를 못 쓰는 브라우저에서는 띄우지 않는다 (매번 뜨면 성가시다)
    }
    // 어드민과 카드 이미지 화면에서는 자동으로 띄우지 않는다
    if (!seen && !path.startsWith("/admin") && !path.startsWith("/onboarding")) setOpen(true);
    return () => window.removeEventListener(OPEN_EVENT, show);
    // 첫 진입 때만 판단한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    // 카드뉴스를 닫으면 화면 안내 투어로 이어진다
    setTimeout(startTour, 250);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="짝꽁빙고 시작 가이드"
        className="pop w-full max-w-[25rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <OnboardingDeck loggedIn={loggedIn} onDone={close} />
      </div>
    </div>
  );
}

/** 옆으로 넘기는 카드 묶음. 손가락으로 밀거나 화살표·점·키보드로 넘긴다 */
export function OnboardingDeck({ loggedIn, onDone }: { loggedIn: boolean; onDone: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const last = at === ONBOARDING_COUNT - 1;

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(ONBOARDING_COUNT - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(at + 1);
      if (e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-sm font-bold text-white/85 hover:bg-white/15 hover:text-white">
          {last ? "닫기" : "건너뛰기"} ✕
        </button>
      </div>
      <div className="relative overflow-hidden rounded-[1.6rem] shadow-[0_24px_60px_-20px_rgba(31,42,38,0.5)]">
        <div
          ref={track}
          onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="nav-scroll flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {Array.from({ length: ONBOARDING_COUNT }, (_, i) => (
            <div key={i} className="w-full shrink-0 snap-center" aria-hidden={i !== at}>
              <CardBox index={i} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(at - 1)}
          disabled={at === 0}
          aria-label="이전 카드"
          className="inline-flex size-11 items-center justify-center rounded-full bg-white text-lg font-black text-ink transition-opacity disabled:opacity-0"
        >
          ←
        </button>
        <div className="flex gap-1.5" role="tablist" aria-label="카드 선택">
          {Array.from({ length: ONBOARDING_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === at}
              aria-label={`${i + 1}번째 카드`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === at ? "w-6 bg-white" : "w-2 bg-white/45"}`}
            />
          ))}
        </div>
        {last ? (
          loggedIn ? (
            <button type="button" onClick={onDone} className="btn h-11 rounded-full bg-white px-5 text-ink hover:bg-mint-soft">
              시작하기
            </button>
          ) : (
            <Link href="/api/auth/discord" prefetch={false} onClick={onDone} className="btn h-11 rounded-full bg-white px-5 text-ink hover:bg-mint-soft">
              디스코드로 로그인
            </Link>
          )
        ) : (
          <button
            type="button"
            onClick={() => go(at + 1)}
            aria-label="다음 카드"
            className="inline-flex size-11 items-center justify-center rounded-full bg-white text-lg font-black text-ink"
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}

/** 이용 방법 페이지 등에서 가이드를 다시 여는 버튼 */
export function OpenOnboardingButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openOnboarding} className={className}>
      카드로 한눈에 보기
    </button>
  );
}

/*
 * 화면 안내 투어. 카드뉴스를 본 뒤, 화면에 있는 요소를 하나씩 비추며 설명한다.
 * 본 단계는 기억해 두고, 다른 화면(예: 빙고판)에서 새 요소가 보이면 그것만 이어서 안내한다.
 */
const TOUR_KEY = "jk_tour_v1";
const TOUR_EVENT = "jk:tour";
const STEPS: { id: string; title: string; body: string }[] = [
  { id: "nav-board", title: "우리 팀 빙고판", body: "팀원과 함께 만든 5×5 판을 보고, 칸을 눌러 인증 명령어를 복사해요." },
  { id: "nav-missions", title: "미션 목록", body: "오늘 공지된 비대면 미션과 대면 미션 5개를 한눈에 봐요." },
  { id: "nav-ranking", title: "랭킹", body: "빙고 줄 → 채운 칸 → 대면 미션 순으로 순위가 매겨져요." },
  { id: "nav-how-to", title: "이용 방법", body: "헷갈리면 언제든 여기서 규칙과 카드 가이드를 다시 볼 수 있어요." },
  { id: "board", title: "칸을 눌러 보세요", body: "미션 설명과 마감, 디스코드에 붙여 넣을 /인증 명령어가 나와요." },
  { id: "decor", title: "판 꾸미기", body: "테두리 색을 고르고 스티커를 붙여 우리 팀만의 판으로 꾸며요. 점수와는 상관없어요." },
];

export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TOUR_KEY) ?? "[]");
  } catch {
    return STEPS.map((s) => s.id); // 저장소를 못 쓰면 투어를 띄우지 않는다
  }
}

export function TourGate() {
  const path = usePathname();
  const [steps, setSteps] = useState<typeof STEPS>([]);
  const [at, setAt] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const find = (id: string) => {
    const el = [...document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)].find((e) => e.offsetParent !== null);
    return el ?? null;
  };

  useEffect(() => {
    const check = () => {
      if (path.startsWith("/admin") || path.startsWith("/onboarding")) return;
      try {
        if (localStorage.getItem(SEEN_KEY) !== "1") return;
      } catch {
        return;
      }
      const seen = readSeen();
      const todo = STEPS.filter((s) => !seen.includes(s.id) && find(s.id));
      if (todo.length) {
        setSteps(todo);
        setAt(0);
      }
    };
    const t = setTimeout(check, 700);
    window.addEventListener(TOUR_EVENT, check);
    return () => {
      clearTimeout(t);
      window.removeEventListener(TOUR_EVENT, check);
    };
  }, [path]);

  const step = steps[at];
  useEffect(() => {
    if (!step) return;
    const el = find(step.id);
    if (!el) return;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    // 스크롤·레이아웃 이동을 따라가도록 매 프레임 위치를 확인한다 (바뀔 때만 다시 그린다)
    let raf = 0;
    let prev = "";
    const tick = () => {
      const r = el.getBoundingClientRect();
      const k = `${r.left|0},${r.top|0},${r.width|0},${r.height|0}`;
      if (k !== prev) {
        prev = k;
        setRect(r);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const finish = useCallback(
    (all: boolean) => {
      try {
        const done = all ? steps : steps.slice(0, at + 1);
        localStorage.setItem(TOUR_KEY, JSON.stringify([...new Set([...readSeen(), ...done.map((s) => s.id)])]));
      } catch {}
      setSteps([]);
      setRect(null);
    },
    [steps, at],
  );

  if (!step || !rect) return null;
  const pad = 8;
  const below = rect.top + rect.height / 2 < window.innerHeight / 2;
  const last = at === steps.length - 1;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - 150), window.innerWidth - 312);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={step.title}>
      <div
        className="pointer-events-none absolute rounded-2xl transition-all duration-300 [transition-timing-function:var(--spring)]"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 3px var(--sun-ring), 0 0 0 9999px rgba(31,42,38,0.6)",
        }}
      />
      <div
        key={step.id}
        className="pop absolute w-[300px] rounded-[1.4rem] bg-white p-5 shadow-[0_20px_50px_-15px_rgba(31,42,38,0.5)]"
        style={below ? { left, top: rect.bottom + pad + 12 } : { left, bottom: window.innerHeight - rect.top + pad + 12 }}
      >
        <p className="text-xs font-bold text-muted">
          {at + 1} / {steps.length}
        </p>
        <p className="mt-1 text-lg font-black tracking-[-0.03em]">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-sub">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => finish(true)} className="text-sm font-bold text-muted hover:text-ink">
            그만 보기
          </button>
          {at > 0 && (
            <button type="button" onClick={() => setAt(at - 1)} className="btn ml-auto h-10 rounded-xl bg-well px-3 text-sm">
              이전
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? finish(true) : setAt(at + 1))}
            className={`btn h-10 rounded-xl bg-green px-4 text-sm text-white hover:bg-mint-deep ${at > 0 ? "" : "ml-auto"}`}
          >
            {last ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
