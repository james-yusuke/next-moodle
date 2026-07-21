import { GraduationCap } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login/login-form";
import { Notice, ThemeControl } from "@/components/ui";
import { loadOptionalMoodleSession } from "@/lib/auth/server";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { MoodleConfigurationError, readMoodleConfig } from "@/lib/moodle/server";
import "@/components/login/login.css";

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
    <main className="ui-login-page">
      <div className="ui-login-workspace">
        <section className="ui-login-story" aria-labelledby="login-story-title">
          <div className="ui-login-brand">
            <GraduationCap aria-hidden size={26} weight="regular" />
            <span>{appName}</span>
          </div>
          <div className="ui-login-copy">
            <p className="ui-login-kicker">Moodle workspace</p>
            <h1 id="login-story-title">Moodleへ安全に接続</h1>
            <p>コース、締切、課題提出を読みやすい作業画面にまとめます。Moodle本体のデータ構造は変更しません。</p>
          </div>
          <dl className="ui-login-ledger">
            <div><dt>接続先</dt><dd>{connectionLabel}</dd></div>
            <div><dt>認証情報</dt><dd>ログイン時だけ使用し、保存しません</dd></div>
            <div><dt>セッション</dt><dd>暗号化されたHttpOnly Cookieで8時間保護</dd></div>
          </dl>
        </section>
        <section className="ui-login-panel" aria-labelledby="login-title">
          <div className="ui-login-panel__inner">
            <div className="ui-login-theme"><ThemeControl /></div>
            <header className="ui-login-panel__header">
              <h2 id="login-title">認証情報</h2>
              <p>Moodleで使用しているユーザー名とパスワードを入力してください。</p>
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
