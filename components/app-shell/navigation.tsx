"use client";

import styles from "./navigation.module.css";
import {
  Bell,
  Books,
  CalendarDots,
  ChatCircleDots,
  House,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

import { TransitionLink } from "./transitions";
import { classNames } from "@/components/ui/class-names";

const NAV_ITEMS = [
  { href: "/dashboard", icon: House, id: "home", label: "ホーム" },
  { href: "/courses", icon: Books, id: "courses", label: "コース" },
  { href: "/calendar", icon: CalendarDots, id: "calendar", label: "予定" },
  { href: "/messages", icon: ChatCircleDots, id: "messages", label: "メッセージ" },
  { href: "/notifications", icon: Bell, id: "notifications", label: "通知" },
] as const;

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppNavigation({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "モバイル主要ナビゲーション" : "主要ナビゲーション"}
      className={classNames(
        styles.appNav!,
        mobile
          ? styles.appNavMobile!
          : styles.style1!,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const current = isCurrentPath(pathname, item.href);
        return (
          <TransitionLink
            aria-current={current ? "page" : undefined}
            className={classNames(
              styles.appNavLink!,
              mobile && styles.style2!,
              current
                ? styles.style3!
                : styles.style4!,
            )}
            href={item.href}
            intent="switch"
            key={item.href}
            title={mobile ? undefined : item.label}
          >
            <span aria-hidden className={styles.appNavIcon!} data-testid={`primary-nav-${item.id}-icon`}><Icon aria-hidden className={styles.style5!} size={21} weight={current ? "fill" : "regular"} /></span>
            <span className={classNames(styles.style6!, !mobile && styles.style7!)}>{item.label}</span>
            {current ? <span aria-hidden className={classNames(styles.style8!, mobile ? styles.style9! : styles.style10!)} /> : null}
          </TransitionLink>
        );
      })}
    </nav>
  );
}
