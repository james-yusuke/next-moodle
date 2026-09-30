import styles from "./page.module.css";
import { Command, Keyboard } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "キーボードショートカット" };

const SHORTCUTS = [
  { keys: ["⌘ / Ctrl", "K"], label: "画面・コース・活動・会話を検索" },
  { keys: ["↑", "↓"], label: "検索候補を移動" },
  { keys: ["Enter"], label: "選択した項目を開く" },
  { keys: ["Esc"], label: "検索またはAI候補を閉じる" },
  { keys: ["Tab"], label: "AI入力候補を明示的に採用" },
] as const;

export default function ShortcutsPage() {
  return (
    <PageFrame content={<Card className={styles.shortcuts!} aria-labelledby="shortcut-list-title" padding="none">
        <header className={styles.style1!}><Keyboard aria-hidden className={styles.style2!} size={20} /><div><h2 className={styles.style3!} id="shortcut-list-title">共通操作</h2><p className={styles.style4!}>macOSでは⌘、Windows / LinuxではCtrlを使います。</p></div></header>
        <dl className={styles.style5!}>{SHORTCUTS.map((shortcut) => <div className={styles.style6!} key={shortcut.label}><dt className={styles.style7!}>{shortcut.keys.map((key) => <kbd className={styles.style8!} key={key}>{key}</kbd>)}</dt><dd className={styles.style9!}>{shortcut.label}</dd></div>)}</dl>
        <p className={styles.style10!}><Command aria-hidden className={styles.style11!} size={17} />入力欄ではブラウザとOS標準の編集ショートカットもそのまま使えます。</p>
      </Card>} header={<RouteHeader description="マウスへ移動せず、学習画面を操作できます。" eyebrow="操作ガイド" title="キーボードショートカット" />} mode="focus" width="reading" />
  );
}
