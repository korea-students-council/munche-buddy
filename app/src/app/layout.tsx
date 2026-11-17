import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { PairMark } from "@/components/mascot";
import { OnboardingGate, TourGate } from "@/components/onboarding";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", subsets: ["latin"], weight: ["400", "500", "700", "900"] });

export const metadata: Metadata = {
  title: "짝꽁빙고",
  description: "팀원과 함께 미션을 인증하고 빙고를 완성하세요. 문화체육위원회 짝꽁 사업.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="ko" className={`${noto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 sm:px-8 sm:pt-6">{children}</main>
        <footer className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-4 py-8 text-xs text-muted sm:px-8">
          <PairMark size={24} />
          대한학생회 · 짝꽁빙고
        </footer>
        <OnboardingGate loggedIn={!!user} />
        <TourGate />
      </body>
    </html>
  );
}
