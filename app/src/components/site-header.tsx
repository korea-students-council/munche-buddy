import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./logo";
import { Avatar, btn } from "./ui";
import { BottomNav } from "./bottom-nav";

export const NAV = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/board", label: "우리 팀 빙고", short: "빙고", icon: "🎯" },
  { href: "/missions", label: "미션", icon: "📋" },
  { href: "/ranking", label: "랭킹", icon: "🏆" },
  { href: "/how-to", label: "이용 방법", short: "안내", icon: "💡" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-1.5 text-sm font-bold hover:bg-sun-soft">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" className={btn.small}>
                    어드민
                  </Link>
                )}
                <Avatar name={user.name} src={user.avatar} />
                <form action="/api/auth/logout" method="post">
                  <button className="text-xs font-bold text-muted underline-offset-2 hover:underline">로그아웃</button>
                </form>
              </>
            ) : (
              <Link href="/api/auth/discord" prefetch={false} className={btn.primary}>
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>
      <BottomNav items={NAV.map((n) => ({ href: n.href, label: n.short ?? n.label, icon: n.icon }))} />
    </>
  );
}
