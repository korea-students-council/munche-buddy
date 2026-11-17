import { notFound } from "next/navigation";
import { CardBox, ONBOARDING_COUNT } from "@/components/onboarding-card";

/**
 * 카드뉴스 이미지 내보내기용 화면 (로컬 개발에서만).
 * 1080×1350 창으로 열어 스크린샷을 찍으면 공지용 이미지가 된다.
 */
export default async function OnboardingCardPage({ params }: { params: Promise<{ n: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > ONBOARDING_COUNT) notFound();
  return (
    <div className="fixed inset-0 z-[100] bg-white">
      {/* 개발 서버 표시(N 버튼)가 이미지에 찍히지 않게 */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <CardBox index={n - 1} className="w-screen" />
    </div>
  );
}
