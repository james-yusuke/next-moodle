# next-moodle

Moodleを公式Web Service APIのまま利用し、学生向けフロントエンドを高密度なNext.jsワークスペースへ置き換えるBFFアプリです。トークンは暗号化されたHttpOnly Cookieから外へ出さず、Moodle由来HTMLとファイルはサーバー境界で検証します。

## 学生ワークスペース

- ダッシュボード、コース、教材、活動完了、課題提出、カレンダー、通知
- 成績、参加者、プロフィール、プライベートファイル、バッジ、学習プラン
- 会話一覧、メッセージ送信、通知既読化
- 標準活動を `/activities/[cmid]` の共通ワークスペースへ統合
- 端末内PDFツール

ログイン時にMoodleが返す関数一覧から、機能ごとの `available` / `unavailable` を生成します。関数名の一覧はCookieへ保存せず、SHA-256と小さな能力マニフェストだけを8時間保持します。

## 開発を始める

`.env.example` を参考に、ローカル専用の `.env.local` に次のサーバー環境変数を設定します。

| 変数 | 用途 |
| --- | --- |
| `APP_NAME` | 画面に表示するアプリ名。 |
| `APP_LOCALE` | 日時と数値のロケール。既定値は `ja-JP`。 |
| `APP_TIME_ZONE` | Moodleの日時を表示するIANAタイムゾーン。 |
| `MOODLE_BASE_URL` | MoodleのHTTPS origin。末尾に `/login/index.php` は付けません。 |
| `MOODLE_SERVICE` | Moodle管理者が許可したWeb Service名。通常は `moodle_mobile_app`。 |
| `MOODLE_TEACHER_ROLE_SHORTNAMES` | 先生連絡で宛先候補にするMoodleロールのshortname。 |
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

1つのデプロイは1つの信頼済みMoodleへ接続します。標準Web Serviceを優先し、不足する学生画面は固定URLから認証済みHTMLを取得して、サニタイズ済みの型付き画面モデルへ変換します。利用者が接続先URLを入力する任意URLプロキシは採用していません。

## Moodle側の設定

専用Web Serviceへ、利用する標準 Moodle 関数だけを許可してください。権限のない機能は画面上で明示的に無効になります。標準 API で安全に操作できない活動は、同一 Moodle オリジンの検証済み活動 URL を別タブで開きます。

接続診断は、補助契約だけでなく公開コースの活動種別を横断確認します。公式アダプターまたは補助アダプターに解決できない活動が1件でもあればReadyにせず、活動名や学生データを出さずにモジュール種別と件数だけを表示します。

標準 Web Service にない活動（例: Questionnaire、出席、学内独自活動）は、本アプリで活動状態と教材を表示した上で、接続中 Moodle と同一オリジンの検証済み URL だけを別タブで開きます。トークン、パスワード、任意の外部 URL は引き渡しません。

ローカルのMock Moodleは実在組織と無関係な2ユーザー分のfixtureを提供し、成績、教材、完了更新、課題提出、メッセージ、通知を実環境へ更新せず検証できます。

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

実サイトとの read-only 契約テストは、通常はスキップされます。明示的に実行する場合だけ `MOODLE_LIVE_INTEGRATION=1`、`MOODLE_LIVE_BASE_URL`、`MOODLE_LIVE_USERNAME`、`MOODLE_LIVE_PASSWORD`（任意で `MOODLE_LIVE_SERVICE`）を CI のシークレットとして設定してください。取得した Moodle データは fixture やログへ保存しません。
