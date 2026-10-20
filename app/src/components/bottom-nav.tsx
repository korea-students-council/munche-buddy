"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${active ? "bg-sun" : ""}`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {i.icon}
                </span>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
