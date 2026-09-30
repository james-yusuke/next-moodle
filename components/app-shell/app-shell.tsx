"use client";

import styles from "./app-shell.module.css";
import {
  ChartBar,
  File,
  FilePdf,
  GearSix,
  GraduationCap,
  IdentificationCard,
  Lifebuoy,
  Lightning,
  Table,
  UserCircle,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import type { CommandItem } from "@/components/command-palette/search";
import { PopoverMenu, ThemeControl } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import type { CommandCourse } from "@/lib/moodle/queries/courses";
import { LogoutButton } from "./logout-button";
import { AppNavigation } from "./navigation";
import { TransitionLink, WorkspaceTransition } from "./transitions";
import type { WorkspaceMode } from "./motion";

const SCREEN_COMMANDS = [
  { href: "/dashboard", keywords: ["home", "next"], kind: "screen", label: "ダッシュボード" },
  { href: "/courses", keywords: ["class", "授業"], kind: "screen", label: "コース" },
  { href: "/calendar", keywords: ["予定", "締切"], kind: "screen", label: "カレンダー" },
  { href: "/timetable", keywords: ["授業", "曜日", "時限"], kind: "screen", label: "時間割" },
  { href: "/notifications", keywords: ["お知らせ", "未読"], kind: "screen", label: "通知" },
  { href: "/messages", keywords: ["会話", "連絡"], kind: "screen", label: "メッセージ" },
  { href: "/grades", keywords: ["評価", "点数"], kind: "screen", label: "成績" },
  { href: "/people", keywords: ["参加者", "連絡先"], kind: "screen", label: "参加者" },
  { href: "/files", keywords: ["教材", "保存"], kind: "screen", label: "プライベートファイル" },
  { href: "/badges", keywords: ["実績"], kind: "screen", label: "バッジ" },
  { href: "/plans", keywords: ["目標", "コンピテンシー"], kind: "screen", label: "学習プラン" },
  { href: "/profile", keywords: ["設定", "アカウント"], kind: "screen", label: "プロフィール" },
  { href: "/shortcuts", keywords: ["keyboard", "操作"], kind: "screen", label: "キーボードショートカット" },
  { href: "/diagnostics", keywords: ["api", "接続", "設定"], kind: "screen", label: "接続診断" },
  { href: "/tools/pdf", keywords: ["結合", "画像", "変換"], kind: "screen", label: "PDFツール" },
] as const satisfies readonly CommandItem[];

type AppShellProps = Readonly<{
  appName: string;
  children: ReactNode;
  courses: readonly CommandCourse[];
  siteName: string;
}>;

function resolveWorkspaceMode(pathname: string): WorkspaceMode {
  if (pathname.startsWith("/messages")) return "conversation";
  if (pathname.startsWith("/activities/") || pathname.startsWith("/assignments/")) return "focus";
  if (pathname.startsWith("/courses")) return "browse";
  return "overview";
}

const accountLinkClass = styles.accountLinkClass1!;

function AccountMenuContent({ appName, siteName }: Readonly<{ appName: string; siteName: string }>) {
  return (
    <div className={styles.style1!}>
      <div className={styles.style2!}>
        <strong className={styles.style3!}>{appName}</strong>
        <p className={styles.appSite!} title={siteName}>{siteName}</p>
      </div>
      <div className={styles.style4!} role="group" aria-label="補助機能">
        <TransitionLink className={accountLinkClass} href="/profile" intent="switch"><UserCircle aria-hidden className={styles.style5!} size={18} />プロフィール</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/grades" intent="switch"><ChartBar aria-hidden className={styles.style5!} size={18} />成績</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/files" intent="switch"><File aria-hidden className={styles.style5!} size={18} />ファイル</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/tools/pdf" intent="switch"><FilePdf aria-hidden className={styles.style5!} size={18} />PDF</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/shortcuts" intent="switch"><Lightning aria-hidden className={styles.style5!} size={18} />操作一覧</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/diagnostics" intent="switch"><Lifebuoy aria-hidden className={styles.style5!} size={18} />接続診断</TransitionLink>
        <TransitionLink className={accountLinkClass} href="/timetable" intent="switch"><Table aria-hidden className={styles.style5!} size={18} />時間割</TransitionLink>
        <TransitionLink className={classNames(accountLinkClass, styles.style6!)} href="/people" intent="switch"><IdentificationCard aria-hidden className={styles.style5!} size={18} />参加者</TransitionLink>
      </div>
      <div className={styles.style7!}><ThemeControl /></div>
      <LogoutButton />
    </div>
  );
}

export function AppShell({
  appName,
  children,
  courses,
  siteName,
}: AppShellProps) {
  const pathname = usePathname();
  const workspaceMode = resolveWorkspaceMode(pathname);
  const commands: readonly CommandItem[] = [
    ...SCREEN_COMMANDS,
    ...courses.map((course) => ({
      href: course.href,
      keywords: [course.shortName],
      kind: "course" as const,
      label: course.name,
    })),
  ];

  return (
    <div className={styles.appShell!} data-testid="app-shell" data-workspace-mode={workspaceMode}>
      <a className={styles.appSkip!} href="#main-content">本文へ移動</a>
      <aside aria-label="主要ナビゲーション" className={styles.appFocusRail!}>
        <TransitionLink className={styles.appBrand!} href="/dashboard" intent="switch" title={appName}>
          <span className={styles.appBrandMark!}><GraduationCap aria-hidden size={22} weight="regular" /></span>
          <span className={styles.style8!}>{appName}</span>
        </TransitionLink>
        <div className={styles.style9!}><AppNavigation /></div>
        <footer className={styles.appFocusRailFooter!}>
          <PopoverMenu
            align="start"
            label="表示とアカウント設定"
            side="top"
            trigger={<button aria-label="表示とアカウント設定" className={styles.style10!} type="button"><GearSix aria-hidden className={styles.style5!} size={21} /><span className={styles.style11!}>アカウント</span></button>}
          >
            <AccountMenuContent appName={appName} siteName={siteName} />
          </PopoverMenu>
        </footer>
      </aside>
      <header className={styles.appTopbar!}>
        <TransitionLink className={styles.appBrand2!} href="/dashboard" intent="switch" title={appName}>
          <span className={styles.appBrandMark2!}><GraduationCap aria-hidden size={20} weight="regular" /></span>
          <span className={styles.style12!}>{appName}</span>
        </TransitionLink>
        <div className={styles.appTopbarIdentity!}>
          <strong className={styles.style13!}>{appName}</strong>
          <span className={styles.style14!} title={siteName}>{siteName}</span>
        </div>
        <div className={styles.appContextActions!}>
          <CommandPalette commands={commands} />
        </div>
        <div className={styles.style15!}>
          <PopoverMenu
            label="表示とアカウント設定"
            trigger={<button aria-label="表示とアカウント設定" className={styles.style16!} type="button"><GearSix aria-hidden size={21} /></button>}
          >
            <AccountMenuContent appName={appName} siteName={siteName} />
          </PopoverMenu>
        </div>
      </header>
      <main className={styles.appMain!} id="main-content" tabIndex={-1}>
        <div className={classNames(
          styles.appContent!,
          workspaceMode === "conversation" && styles.style17!,
        )}>
          <div className={classNames(styles.style18!, workspaceMode === "conversation" && styles.style19!)}>
            <WorkspaceTransition>{children}</WorkspaceTransition>
          </div>
        </div>
      </main>
      <AppNavigation mobile />
    </div>
  );
}
