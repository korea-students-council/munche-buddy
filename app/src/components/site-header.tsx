import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "./logo";
import { Avatar, btn } from "./ui";
import { NavTabs } from "./nav-tabs";

export const NAV = [
  { href: "/", label: "홈" },
  { href: "/board", label: "빙고판" },
  { href: "/missions", label: "미션" },
  { href: "/ranking", label: "랭킹" },
  { href: "/how-to", label: "이용 방법" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5 sm:px-8">
        <Logo />
        <div className="order-last w-full md:order-none md:w-auto">
          <NavTabs items={NAV} />
        </div>
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {user.isAdmin && (
                <Link href="/admin" className={btn.small}>
                  어드민
                </Link>
              )}
              <Avatar name={user.name} src={user.avatar} size={38} />
              <form action="/api/auth/logout" method="post">
                <button className="text-xs font-bold text-muted underline-offset-2 hover:underline">로그아웃</button>
              </form>
            </>
          ) : (
            <Link href="/api/auth/discord" prefetch={false} className={btn.primary}>
              디스코드로 로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
