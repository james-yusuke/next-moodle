import { FilePdf, GearSix, GraduationCap } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import type { CommandItem } from "@/components/command-palette/search";
import { ThemeControl } from "@/components/ui";
import type { CommandCourse } from "@/lib/moodle/queries/courses";
import { LogoutButton } from "./logout-button";
import { AppNavigation } from "./navigation";
import "./app-shell.css";
import "./page-layout.css";

const SCREEN_COMMANDS = [
  { href: "/dashboard", keywords: ["home", "next"], kind: "screen", label: "ダッシュボード" },
  { href: "/courses", keywords: ["class", "授業"], kind: "screen", label: "コース" },
  { href: "/calendar", keywords: ["予定", "締切"], kind: "screen", label: "カレンダー" },
  { href: "/notifications", keywords: ["お知らせ", "未読"], kind: "screen", label: "通知" },
  { href: "/tools/pdf", keywords: ["結合", "画像", "変換"], kind: "screen", label: "PDFツール" },
] as const satisfies readonly CommandItem[];

type AppShellProps = Readonly<{
  appName: string;
  children: ReactNode;
  courses: readonly CommandCourse[];
  siteName: string;
}>;

export function AppShell({ appName, children, courses, siteName }: AppShellProps) {
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
    <div className="ui-app-shell">
      <a className="ui-app-skip" href="#main-content">本文へ移動</a>
      <aside className="ui-app-rail">
        <Link className="ui-app-brand" href="/dashboard">
          <GraduationCap aria-hidden size={28} weight="regular" />
          <span>{appName}</span>
        </Link>
        <AppNavigation />
        <Link className="ui-app-tool-link" href="/tools/pdf">
          <FilePdf aria-hidden size={20} weight="regular" />
          <span>PDFツール</span>
        </Link>
        <div className="ui-app-rail__utilities">
          <p className="ui-app-site" title={siteName}>{siteName}</p>
          <ThemeControl />
          <LogoutButton />
        </div>
      </aside>
      <header className="ui-app-topbar">
        <Link className="ui-app-brand ui-app-brand--mobile" href="/dashboard">
          <GraduationCap aria-hidden size={25} weight="regular" />
          <span>{appName}</span>
        </Link>
        <CommandPalette commands={commands} />
        <details className="ui-app-mobile-settings">
          <summary aria-label="表示とアカウント設定">
            <GearSix aria-hidden size={21} weight="regular" />
          </summary>
          <div className="ui-app-mobile-settings__panel">
            <p className="ui-app-site" title={siteName}>{siteName}</p>
            <Link className="ui-app-tool-link" href="/tools/pdf"><FilePdf aria-hidden size={20} /> PDFツール</Link>
            <ThemeControl />
            <LogoutButton />
          </div>
        </details>
      </header>
      <main className="ui-app-main" id="main-content" tabIndex={-1}>
        <div className="ui-app-content">{children}</div>
      </main>
      <AppNavigation mobile />
    </div>
  );
}
