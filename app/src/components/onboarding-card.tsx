import type { ReactNode } from "react";
import { FACE_POSITIONS } from "@/lib/rules";
import { PAIR_VIEWBOX, PairArt } from "./pair-art";

/*
 * 온보딩 카드뉴스 한 장 (4:5, 인스타 1080×1350과 같은 비율).
 * 글자와 여백을 카드 너비 기준(cqw)으로 잡아서, 웹의 작은 카드와
 * 공지용 이미지(1080px)가 똑같이 보인다.
 */

export const ONBOARDING_COUNT = 6;
export const SITE_HOST = "munche-buddy.vercel.app";

function Frame({ index, bg, dark = false, children }: { index: number; bg: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className={`relative flex aspect-[4/5] w-full flex-col overflow-hidden p-[7cqw] ${bg} ${dark ? "text-white" : "text-ink"}`}>
      <div className="flex items-center justify-between text-[3cqw] font-bold">
        <span className="flex items-center gap-[1.6cqw]">
          <svg viewBox={PAIR_VIEWBOX} aria-hidden="true" className="h-auto w-[7cqw]">
            <PairArt />
          </svg>
          짝꽁빙고
        </span>
        <span className={dark ? "text-white/60" : "text-sub"}>
          {index + 1} / {ONBOARDING_COUNT}
        </span>
      </div>
      {children}
    </div>
  );
}

function Title({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <h2 className={`mt-[5cqw] whitespace-pre-line text-[8.6cqw] font-black leading-[1.2] tracking-[-0.045em] ${dark ? "text-white" : ""}`}>{children}</h2>
  );
}

function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex w-fit items-center rounded-full px-[3cqw] py-[1.1cqw] text-[3.1cqw] font-bold ${className}`}>{children}</span>;
}

function Row({ n, children, tone = "bg-white" }: { n: ReactNode; children: ReactNode; tone?: string }) {
  return (
    <li className="flex items-start gap-[3cqw]">
      <span className={`inline-flex size-[6.8cqw] shrink-0 items-center justify-center rounded-[2cqw] text-[3.4cqw] font-black ${tone}`}>{n}</span>
      <span className="pt-[1cqw] text-[3.7cqw] font-medium leading-[1.4]">{children}</span>
    </li>
  );
}

export function OnboardingCard({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <Frame index={0} bg="bg-[#f6f4ee]">
          <Chip className="mt-[8cqw] bg-white text-sub">문화체육위원회 짝꽁 사업</Chip>
          <Title>{"짝꽁빙고\n시작 가이드"}</Title>
          <p className="mt-[3.5cqw] text-[4.2cqw] font-medium leading-[1.45] text-sub">
            짝선배·짝후배가 한 팀이 되어
            <br />
            미션으로 25칸 빙고를 채워요
          </p>
          <svg viewBox={PAIR_VIEWBOX} aria-hidden="true" className="mt-auto h-auto w-[58cqw] translate-y-[4cqw]">
            <PairArt smile />
          </svg>
          <p className="absolute bottom-[7cqw] right-[7.5cqw] rounded-full bg-white px-[3cqw] py-[1.4cqw] text-[3.2cqw] font-bold text-sub">넘겨 보세요 →</p>
        </Frame>
      );
    case 1:
      return (
        <Frame index={1} bg="bg-[#eef3f0]">
          <Title>{"팀을 꾸리고\n빙고판을 만들어요"}</Title>
          <div className="mt-[5cqw] flex items-start gap-[5cqw]">
            <div className="grid w-[38cqw] shrink-0 grid-cols-5 gap-[1.2cqw] rounded-[3.5cqw] bg-white p-[2cqw]">
              {Array.from({ length: 25 }, (_, p) => (
                <span
                  key={p}
                  className={`flex aspect-square items-center justify-center rounded-[1.4cqw] text-[2.2cqw] font-black ${FACE_POSITIONS.includes(p) ? "bg-pink-soft text-pink-deep" : "bg-[#f1f4f2] text-transparent"}`}
                >
                  {FACE_POSITIONS.includes(p) ? "대면" : "·"}
                </span>
              ))}
            </div>
            <p className="pt-[1cqw] text-[3.4cqw] leading-[1.5] text-sub">
              <b className="text-pink-deep">분홍 칸 5개</b>에는 처음 공개된 대면 미션 5개를 놓고, 나머지 <b className="text-ink">20칸</b>에는 비대면 미션을 골라 놓아요.
            </p>
          </div>
          <ul className="mt-auto flex flex-col gap-[2.6cqw] pt-[5cqw]">
            <Row n="1">운영진이 2~4명씩 팀을 짜요</Row>
            <Row n="2">디스코드로 로그인하면 우리 팀이 보여요</Row>
            <Row n="3">시즌 시작 전에 팀명·판 색·미션 배치를 정해요. 시작하면 판이 잠겨요</Row>
          </ul>
        </Frame>
      );
    case 2:
      return (
        <Frame index={2} bg="bg-bg">
          <Title>{"미션은\n이렇게 열려요"}</Title>
          <div className="mt-[4.5cqw] flex flex-col gap-[2.4cqw]">
            <section className="rounded-[4cqw] bg-white px-[5cqw] py-[3.6cqw]">
              <Chip className="bg-sun-soft text-sun-deep">비대면 미션</Chip>
              <p className="mt-[2cqw] text-[5cqw] font-black leading-[1.3] tracking-[-0.03em]">매일 오전 8시에 1개 공지</p>
              <p className="mt-[0.6cqw] text-[3.4cqw] text-sub">그날 23:59까지만 인증할 수 있어요</p>
            </section>
            <section className="rounded-[4cqw] bg-white px-[5cqw] py-[3.6cqw]">
              <Chip className="bg-pink-soft text-pink-deep">대면 미션</Chip>
              <p className="mt-[2cqw] text-[5cqw] font-black leading-[1.3] tracking-[-0.03em]">처음 공개된 5개를 판에 넣어요</p>
              <p className="mt-[0.6cqw] text-[3.4cqw] text-sub">순서 상관없이 아무거나, 다 같이 만나서 해요</p>
            </section>
          </div>
          <p className="mt-auto rounded-[3cqw] bg-white px-[4.5cqw] py-[2.8cqw] text-[3.3cqw] leading-[1.5] text-sub">
            <b className="text-ink">우리 판에 없는 미션</b>이 나온 날도 쉬지 말고 대면 미션으로 한 칸 더! 채운 칸만큼 MT 추첨권이 늘어요.
          </p>
        </Frame>
      );
    case 3:
      return (
        <Frame index={3} bg="bg-[#eef1f3]">
          <Title>{"인증은\n디스코드에서"}</Title>
          <p className="mt-[5cqw] rounded-[3.5cqw] bg-white px-[4.5cqw] py-[3.6cqw] font-mono text-[4.2cqw] font-semibold">
            /인증 <span className="text-muted">번호:</span>
            <span className="text-mint-deep">12</span> <span className="text-muted">사진:</span>
            <span className="text-sun-deep">[첨부]</span>
          </p>
          <ul className="mt-[5cqw] flex flex-col gap-[2.6cqw]">
            <Row n="1" tone="bg-white text-mint-deep">인증 채널에서 / 를 누르고 &quot;인증&quot;을 골라요</Row>
            <Row n="2" tone="bg-white text-mint-deep">칸에 적힌 미션 번호와 사진을 넣어요</Row>
            <Row n="3" tone="bg-white text-mint-deep">보내면 바로 우리 판의 칸이 채워져요</Row>
          </ul>
          <p className="mt-auto text-[3.2cqw] leading-[1.55] text-sub">
            빙고판에서 칸을 누르면 명령어를 바로 복사할 수 있어요.
            <br />
            팀원 모두 함께한 인증만 인정되고, 운영진이 확인해요.
          </p>
        </Frame>
      );
    case 4:
      return (
        <Frame index={4} bg="bg-[#f6f1f2]">
          <Title>{"많이 채울수록\n유리해요"}</Title>
          <ol className="mt-[5cqw] flex flex-col gap-[2cqw]">
            {[
              ["빙고 줄", "가로·세로·대각선 최대 12줄"],
              ["채운 칸", "줄 수가 같으면 25칸 중 몇 칸"],
              ["대면 미션", "그래도 같으면 5개 중 몇 개"],
            ].map(([t, d], i) => (
              <li key={t} className="flex items-center gap-[3.5cqw] rounded-[3.5cqw] bg-white px-[4cqw] py-[2.4cqw]">
                <span className="w-[5cqw] text-[5.4cqw] font-black text-sub">{i + 1}</span>
                <span>
                  <b className="block text-[4.2cqw] font-black leading-[1.3]">{t}</b>
                  <span className="text-[3.2cqw] text-sub">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-auto grid grid-cols-2 gap-[2.5cqw] pt-[4cqw]">
            <div className="rounded-[3.5cqw] bg-white px-[4cqw] py-[3.4cqw]">
              <p className="text-[3.2cqw] font-bold text-pink-deep">우수상 · 1·2등 팀</p>
              <p className="mt-[0.5cqw] text-[4.4cqw] font-black leading-tight">MT 벌칙 면제권</p>
            </div>
            <div className="rounded-[3.5cqw] bg-white px-[4cqw] py-[3.4cqw]">
              <p className="text-[3.2cqw] font-bold text-sub">모든 팀 · MT 추첨권</p>
              <p className="mt-[0.5cqw] text-[3.3cqw] font-bold leading-[1.35]">채운 칸 수만큼 1인당 (7칸 → 7장)</p>
            </div>
          </div>
        </Frame>
      );
    default:
      return (
        <Frame index={5} bg="bg-white">
          <Title>{"지금 우리 팀\n빙고판을 열어 봐요"}</Title>
          <p className="mt-[3.5cqw] text-[4.2cqw] font-medium leading-[1.45] text-sub">디스코드 계정으로 로그인하면 끝!</p>
          <p className="mt-[5cqw] w-fit rounded-[3cqw] bg-[#eef3f0] px-[4.5cqw] py-[3cqw] text-[4.4cqw] font-black tracking-[-0.02em] text-mint-deep">{SITE_HOST}</p>
          <svg viewBox={PAIR_VIEWBOX} aria-hidden="true" className="mx-auto mt-auto h-auto w-[58cqw] translate-y-[4cqw]">
            <PairArt smile />
          </svg>
        </Frame>
      );
  }
}

/** 카드 너비를 기준(cqw)으로 쓰게 하는 감싸개 */
export function CardBox({ index, className = "" }: { index: number; className?: string }) {
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <OnboardingCard index={index} />
    </div>
  );
}
