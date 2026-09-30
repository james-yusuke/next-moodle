import styles from "./page.module.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeControl } from "@/components/ui";
import { ActionShowcase } from "./action-showcase";
import { FeedbackShowcase } from "./feedback-showcase";
import { FieldShowcase } from "./field-showcase";
import { SubmissionShowcase } from "./submission-showcase";
import { EditorialNativeShowcase } from "./ink-workspace-showcase";

export const metadata: Metadata = {
  title: "静かな学習OS UI — Development",
  description: "Development-only primitive showcase for next-moodle.",
};

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className={styles.style1!} data-testid="ui-showcase">
      <header className={styles.style2!}>
        <div className={styles.style3!}>
          <span className={styles.style4!}>next-moodle / 静かな学習OS</span>
          <h1 className={styles.style5!}>
            <span className={styles.style6!}>見つける、進める、</span>
            <span className={styles.style6!}>完了する。</span>
          </h1>
          <p className={styles.style7!}>
            学習内容を最優先に、4段階の面、安定した44px操作領域、意味のある状態変化を確認する開発専用カタログです。
          </p>
        </div>
        <div className={styles.style8!}>
          <span className={styles.style9!}>Live theme</span>
          <ThemeControl />
        </div>
        <dl className={styles.style10!}>
          <div className={styles.style11!}>
            <dt className={styles.style9!}>Radii</dt>
            <dd className={styles.tabular!}>10 / 14 / 18</dd>
          </div>
          <div className={styles.style11!}>
            <dt className={styles.style9!}>Touch</dt>
            <dd className={styles.tabular!}>≥ 44px</dd>
          </div>
          <div className={styles.style11!}>
            <dt className={styles.style9!}>Motion</dt>
            <dd className={styles.style12!}>120 / 180 / 200 / 220ms</dd>
          </div>
        </dl>
      </header>

      <EditorialNativeShowcase />
      <ActionShowcase />
      <FieldShowcase />
      <FeedbackShowcase />
      <SubmissionShowcase />

      <footer className={styles.style13!}>
        <span>Editorial Native primitives</span>
        <span className={styles.tabular2!}>Next.js 16 · CSS Modules</span>
      </footer>
    </main>
  );
}
