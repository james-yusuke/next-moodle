import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeControl } from "@/components/ui";
import { ActionShowcase } from "./action-showcase";
import { FeedbackShowcase } from "./feedback-showcase";
import { FieldShowcase } from "./field-showcase";
import { SubmissionShowcase } from "./submission-showcase";
import styles from "./showcase.module.css";

export const metadata: Metadata = {
  title: "Midnight Ledger UI — Development",
  description: "Development-only primitive showcase for next-moodle.",
};

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className={styles.page} data-testid="ui-showcase">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>next-moodle / Midnight Ledger</span>
          <h1 className={styles.title}>
            <span className={styles.titleLine}>学びを、</span>
            <span className={styles.titleLine}>迷わず前へ。</span>
          </h1>
          <p className={styles.lede}>
            A dark-first learning cockpit system with quiet graphite depth, functional indigo,
            and complete interaction states. This route exists in development only.
          </p>
        </div>
        <div className={styles.heroControl}>
          <span className={styles.controlLabel}>Live theme</span>
          <ThemeControl />
        </div>
        <dl className={styles.metrics}>
          <div>
            <dt>Radii</dt>
            <dd className="ui-tabular">8 / 12 / 18</dd>
          </div>
          <div>
            <dt>Touch</dt>
            <dd className="ui-tabular">≥ 44px</dd>
          </div>
          <div>
            <dt>Motion</dt>
            <dd>transform + opacity</dd>
          </div>
        </dl>
      </header>

      <ActionShowcase />
      <FieldShowcase />
      <FeedbackShowcase />
      <SubmissionShowcase />

      <footer className={styles.footer}>
        <span>Midnight Ledger primitives</span>
        <span className="ui-tabular">Next.js 16 · Tailwind CSS 4</span>
      </footer>
    </main>
  );
}
