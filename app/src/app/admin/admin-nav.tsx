"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/event", label: "시즌 설정" },
  { href: "/admin/missions", label: "미션 관리" },
  { href: "/admin/teams", label: "팀 관리" },
  { href: "/admin/submissions", label: "인증 검수" },
  { href: "/admin/ranking", label: "순위·시상" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="어드민 메뉴">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
              active ? "border-ink bg-sun" : "border-transparent hover:bg-sun-soft"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
