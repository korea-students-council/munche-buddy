import type { Metadata } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const noto = Noto_Sans_KR({ variable: "--font-noto", subsets: ["latin"], weight: ["400", "500", "700", "900"] });
const jua = Jua({ variable: "--font-jua", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "짝꽁 빙고",
  description: "팀원과 함께 미션을 인증하고 빙고를 완성하세요. 대한학생회 짝꽁 사업.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${noto.variable} ${jua.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-8 md:pb-12">{children}</main>
        <footer className="hidden border-t-2 border-ink bg-white py-5 text-center text-xs text-muted md:block">
          대한학생회 · 짝꽁 빙고
        </footer>
      </body>
    </html>
  );
}
