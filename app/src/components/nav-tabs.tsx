"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 헤더 가운데의 알약 모양 탭. 좁은 화면에서는 가로로 밀어 볼 수 있다 */
export function NavTabs({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="주 메뉴" className="nav-scroll -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 rounded-[1.1rem] bg-white p-1 shadow-[0_1px_2px_rgba(48,29,21,0.06)]">
        {items.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center whitespace-nowrap rounded-[0.85rem] px-4 text-sm font-bold transition-colors ${active ? "bg-ink text-white" : "text-muted hover:bg-well hover:text-ink"}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
