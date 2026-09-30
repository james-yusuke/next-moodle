import styles from "./page.module.css";
import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { Notice, ThemeControl } from "@/components/ui";
import { loadOptionalMoodleSession } from "@/lib/auth/server";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { MoodleConfigurationError, readMoodleConfig } from "@/lib/moodle/server";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Moodleの学習情報を安全に確認するためのログイン画面です。",
};

type LoginPageProps = Readonly<{
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { appName } = readAppRuntimeConfig();
  let connectionLabel = "接続先が未設定です";
  try {
    connectionLabel = new URL(readMoodleConfig().baseUrl).host;
  } catch (error) {
    if (!(error instanceof MoodleConfigurationError)) {
      throw error;
    }
  }
  const session = await loadOptionalMoodleSession();
  if (session !== null) {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const reason = typeof params["reason"] === "string" ? params["reason"] : undefined;

  return (
    <main className={styles.loginPage!}>
      <div className={styles.loginWorkspace!}>
        <section className={styles.loginStory!} aria-labelledby="login-story-title">
          <div className={styles.loginBrand!}>
            <GraduationCap aria-hidden className={styles.style1!} size={26} weight="regular" />
            <span>{appName}</span>
          </div>
          <div className={styles.loginCopy!}>
            <p className={styles.loginKicker!}>MOODLE WORKSPACE</p>
            <h1 className={styles.style2!} id="login-story-title">Moodleへ安全に接続</h1>
            <p className={styles.style3!}>コース、締切、課題提出を読みやすい作業画面にまとめます。Moodle本体のデータ構造は変更しません。</p>
          </div>
          <dl className={styles.loginLedger!}>
            <div className={styles.style4!}><dt className={styles.style5!}>接続先</dt><dd className={styles.style6!}>{connectionLabel}</dd></div>
            <div className={styles.style4!}><dt className={styles.style5!}>認証情報</dt><dd className={styles.style7!}>ログイン時だけ使用し、保存しません</dd></div>
            <div className={styles.style4!}><dt className={styles.style5!}>セッション</dt><dd className={styles.style7!}>暗号化されたHttpOnly Cookieで8時間保護</dd></div>
          </dl>
        </section>
        <section className={styles.loginPanel!} aria-labelledby="login-title">
          <div className={styles.loginPanelInner!}>
            <div className={styles.loginTheme!}><ThemeControl /></div>
            <header className={styles.loginPanelHeader!}>
              <h2 className={styles.style8!} id="login-title">認証情報</h2>
              <p className={styles.style9!}>Moodleで使用しているユーザー名とパスワードを入力してください。</p>
            </header>
            {reason === "expired" ? (
              <Notice title="セッションが終了しました" tone="warning">
                <p>安全のため、もう一度ログインしてください。</p>
              </Notice>
            ) : null}
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
