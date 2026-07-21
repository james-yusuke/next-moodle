# next-moodle

Moodleを変更せず、公式Web Service APIをNext.jsのBFF経由で利用する学生向けコックピットです。Moodleのトークンはブラウザへ渡しません。

- ダーク優先のMidnight Ledger UIと青灰色ライトテーマ
- ダッシュボード、コース、課題、カレンダー、通知、保護教材ファイル
- HTML／プレーン／Markdownを保持する提出フォームと安全なファイル再提出
- 画像→PDF、結合、並べ替え、回転、抽出、メタデータ削除を端末内で行うPDFツール
- 表示中の予定を端末内で生成するICSエクスポート

## 開発を始める

`.env.example` を参考に、ローカル専用の `.env.local` に次のサーバー環境変数を設定します。

| 変数 | 用途 |
| --- | --- |
| `APP_NAME` | 画面に表示するアプリ名。 |
| `APP_LOCALE` | 日時と数値のロケール。既定値は `ja-JP`。 |
| `APP_TIME_ZONE` | Moodleの日時を表示するIANAタイムゾーン。 |
| `MOODLE_BASE_URL` | MoodleのHTTPS origin。末尾に `/login/index.php` は付けません。 |
| `MOODLE_SERVICE` | Moodle管理者が許可したWeb Service名。通常は `moodle_mobile_app`。 |
| `SESSION_PASSWORD` | 32バイト以上のランダムな暗号化Cookie秘密鍵。 |

秘密鍵は次で生成できます。

```sh
openssl rand -hex 48
```

その後、依存関係を入れて起動します。

```sh
bun install
bun run dev
```

`configuration_error` が出る場合は、起動中のプロセスが `MOODLE_BASE_URL` と `SESSION_PASSWORD` を読み込んでいません。 `.env.local` を保存した後、開発サーバーを再起動してください。Moodleのユーザー名やパスワードを環境変数へ保存する必要はありません。

1つのデプロイは1つの信頼済みMoodleへ接続します。利用者が接続先URLを入力する構成や、Moodle画面のスクレイピングは採用していません。

## 検証

```sh
bun run lint
bunx tsc --noEmit
bun test
bun run build
bun run test:e2e
bun run react:doctor
bun audit
```

実ChromeのLighthouse監査は、Mock Moodleまたは更新操作が許可された専用テスト環境を起動し、専用テストアカウントを`LIGHTHOUSE_USER`と`LIGHTHOUSE_PASSWORD`へ一時設定して`bun run audit:lighthouse`を実行します。監査レポートは`.omo/evidence/lighthouse/`へ保存されます。
