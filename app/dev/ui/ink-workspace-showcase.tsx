import styles from "./ink-workspace-showcase.module.css";
import {
  Bell,
  BookOpen,
  CalendarDots,
  ChatCircleDots,
  House,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";

import { ActionDock, DataRow, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Button, Card, DataList, DataListItem, Progress, Toolbar } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import { ShowcaseSample, ShowcaseSection } from "./showcase-frame";

const NAV_ITEMS = [
  { icon: House, label: "ホーム", selected: true },
  { icon: BookOpen, label: "コース", selected: false },
  { icon: CalendarDots, label: "予定", selected: false },
  { icon: ChatCircleDots, label: "メッセージ", selected: false },
  { icon: Bell, label: "通知", selected: false },
] as const;

export function EditorialNativeShowcase() {
  return (
    <ShowcaseSection
      description="学習内容を最優先にした面の階層、安定した主要導線、動かないリスト、短い状態遷移を確認します。"
      eyebrow="00 / Quiet learning OS"
      title="Content, context, and calm motion"
    >
      <div className={styles.style1!}>
        <ShowcaseSample label="Page frame primitives" wide>
          <div className={styles.style2!}>
            <div className={styles.style3!}><RouteHeader description="必要な文脈だけを残した学習キャンバス" eyebrow="COURSE / 04" metadata="12 items" title="研究方法入門" /></div>
            <div className={styles.style4!}><DataRow index="01" metadata="教材 · 8分" state="完了" title="観察記録の読み方" /><DataRow index="02" metadata="課題 · 金曜 17:00" state="未完了" title="比較観察レポート" /></div>
            <ActionDock><span className={styles.style5!}>すべての変更を保存済み</span><Button>次へ進む</Button></ActionDock>
          </div>
        </ShowcaseSample>

        <ShowcaseSample label="Adaptive primary navigation">
          <nav aria-label="ナビゲーション見本" className={styles.style6!}>
            <strong className={styles.style7!}>next-moodle</strong>
            <span className={styles.style8!}><MagnifyingGlass aria-hidden size={17} />移動・検索</span>
            {NAV_ITEMS.map(({ icon: Icon, label, selected }) => <span className={classNames(styles.style18!, selected ? styles.style22! : styles.style32!)} data-selected={selected} key={label}><Icon aria-hidden className={styles.style9!} size={20} />{label}</span>)}
          </nav>
        </ShowcaseSample>

        <ShowcaseSample label="Course activity list">
          <Card padding="standard"><DataList label="活動"><DataListItem action={<Button size="compact" variant="ghost">開く</Button>} description="小テスト · 明日 17:00" icon={<BookOpen aria-hidden size={18} />} state={<Badge tone="warning">未完了</Badge>} title="理解度チェック" /><DataListItem description="教材 · 8分" icon={<BookOpen aria-hidden size={18} />} state={<Badge tone="success">完了</Badge>} title="観察記録の読み方" /></DataList></Card>
        </ShowcaseSample>

        <ShowcaseSample label="Search and filters">
          <Toolbar label="コース検索"><span className={styles.style10!}><MagnifyingGlass aria-hidden size={17} />コース・活動を検索</span><Badge tone="accent">進行中</Badge></Toolbar>
        </ShowcaseSample>

        <ShowcaseSample label="Progress and next action">
          <Card className={styles.style11!} padding="spacious" tone="selected"><span className={styles.style12!}>NEXT ACTION</span><div><h3 className={styles.style13!}>比較観察レポート</h3><p className={styles.style14!}>締切 金曜 17:00</p></div><Progress label="コース進捗" showValue value={64} /><Button>課題を続ける</Button></Card>
        </ShowcaseSample>
      </div>

      <div className={styles.style15!} aria-label="モーション意図">
        {[
          ["操作", "120ms · 色と押下"],
          ["オーバーレイ", "180ms · 4–16px"],
          ["ルート", "200ms · View Transition"],
          ["共有要素", "220ms · タイトルのみ"],
        ].map(([title, detail]) => <span className={styles.style16!} key={title}><strong className={styles.style17!}>{title}</strong><small className={styles.style5!}>{detail}</small></span>)}
      </div>
    </ShowcaseSection>
  );
}
