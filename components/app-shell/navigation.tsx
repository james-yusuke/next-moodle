"use client";

import {
  Bell,
  Books,
  CalendarDots,
  House,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: House, label: "ホーム" },
  { href: "/courses", icon: Books, label: "コース" },
  { href: "/calendar", icon: CalendarDots, label: "カレンダー" },
  { href: "/notifications", icon: Bell, label: "通知" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "モバイル主要ナビゲーション" : "主要ナビゲーション"}
      className={mobile ? "ui-app-nav ui-app-nav--mobile" : "ui-app-nav"}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const current = isCurrentPath(pathname, item.href);
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className="ui-app-nav__link"
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden size={21} weight="regular" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
