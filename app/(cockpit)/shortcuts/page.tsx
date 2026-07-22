import { Command, Keyboard } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import "@/components/student/student.css";

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
    <PageFrame content={<section className="ui-shortcuts" aria-labelledby="shortcut-list-title">
        <header><Keyboard aria-hidden size={20} /><div><h2 id="shortcut-list-title">共通操作</h2><p>macOSでは⌘、Windows / LinuxではCtrlを使います。</p></div></header>
        <dl>{SHORTCUTS.map((shortcut) => <div key={shortcut.label}><dt>{shortcut.keys.map((key) => <kbd key={key}>{key}</kbd>)}</dt><dd>{shortcut.label}</dd></div>)}</dl>
        <p><Command aria-hidden size={17} />入力欄ではブラウザとOS標準の編集ショートカットもそのまま使えます。</p>
      </section>} header={<RouteHeader description="マウスへ移動せず、学習画面を操作できます。" eyebrow="操作ガイド" title="キーボードショートカット" />} mode="focus" />
  );
}
