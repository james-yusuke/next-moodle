# next-moodle

Moodleを公式Web Service APIのまま利用し、学生向けフロントエンドを高密度なNext.jsワークスペースへ置き換えるBFFアプリです。トークンは暗号化されたHttpOnly Cookieから外へ出さず、Moodle由来HTMLとファイルはサーバー境界で検証します。

## 学生ワークスペース

- ダッシュボード、コース、教材、活動完了、課題提出、カレンダー、通知
- 成績、参加者、プロフィール、プライベートファイル、バッジ、学習プラン
- 会話一覧、メッセージ送信、通知既読化
- 標準活動を `/activities/[cmid]` の共通ワークスペースへ統合
- 端末内PDFツールと、明示同意が必要なAI文章補助

ログイン時にMoodleが返す関数一覧から、機能ごとの `available` / `adapter_required` / `unavailable` を生成します。関数名の一覧はCookieへ保存せず、SHA-256と小さな能力マニフェストだけを8時間保持します。

## 開発を始める

`.env.example` を参考に、ローカル専用の `.env.local` に次のサーバー環境変数を設定します。

| 変数 | 用途 |
| --- | --- |
| `APP_NAME` | 画面に表示するアプリ名。 |
| `APP_LOCALE` | 日時と数値のロケール。既定値は `ja-JP`。 |
| `APP_TIME_ZONE` | Moodleの日時を表示するIANAタイムゾーン。 |
| `MOODLE_BASE_URL` | MoodleのHTTPS origin。末尾に `/login/index.php` は付けません。 |
| `MOODLE_SERVICE` | Moodle管理者が許可したWeb Service名。通常は `moodle_mobile_app`。 |
| `MOODLE_REQUIRE_COMPANION` | `true`なら補助契約v2の5関数が揃うまで完全置換Readyにしません。 |
| `MOODLE_TEACHER_ROLE_SHORTNAMES` | 先生連絡で宛先候補にするMoodleロールのshortname。 |
| `SESSION_PASSWORD` | 32バイト以上のランダムな暗号化Cookie秘密鍵。 |
| `AI_ASSIST_ENABLED` | `true`のときだけAI文章補助を有効化。既定値は`false`。 |
| `OPENAI_API_KEY` | OpenAI APIキー。サーバー限定で、ブラウザへ渡しません。 |
| `OPENAI_COMPLETION_MODEL` | 入力中の短い候補に使うモデル。 |
| `OPENAI_REVIEW_MODEL` | 不足点・補足段落の明示レビューに使うモデル。 |
| `AI_SAFETY_SECRET` | 匿名の安全識別子を作る、32バイト以上の独立した秘密鍵。 |
| `AI_PRIVACY_NOTICE_URL` | 同意画面から案内する任意のHTTPSプライバシー説明。 |

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

## Moodle側の設定

専用Web Serviceへ、利用する機能の公式関数だけを許可してください。権限のない機能は画面上で明示的に無効になります。学生向けUIを完全置換する構成では、`moodle-plugin/local_nextmoodle` の補助プラグインと契約v2の5関数が必須です。補助契約は任意HTMLを受け取らず、許可された操作と型付き表示ブロックに限定しています。補助サービスはインストール直後は無効なので、Moodle管理者が専用Web Serviceへ明示的に追加してください。

接続診断は、補助契約だけでなく公開コースの活動種別を横断確認します。公式アダプターまたは補助アダプターに解決できない活動が1件でもあればReadyにせず、活動名や学生データを出さずにモジュール種別と件数だけを表示します。

ローカルのMock Moodleは実在組織と無関係な2ユーザー分のfixtureを提供し、成績、教材、完了更新、課題提出、メッセージ、通知を実環境へ更新せず検証できます。

## AI文章補助

AI文章補助は初期状態で無効です。有効化しても、利用者が課題エディタ内で同意するまではOpenAIへ通信しません。同意はMoodleサイトとユーザーごとに分離した不透明なキーで端末内へ保存され、設定メニューからいつでも削除できます。

入力候補へ送るのは、課題名、プレーンテキスト化した課題文、カーソル前最大2,000文字と後最大500文字です。補足レビューは選択範囲または現在の節を最大6,000文字だけ送ります。氏名、Moodleトークン、添付ファイル、コース一覧、全文下書きは送りません。Responses APIは`store: false`、ツールなし、会話状態なしで呼び、プロンプトと出力をアプリのログへ記録しません。通常のAPI利用では、Zero Data Retention契約がない場合に不正利用監視ログが最大30日保持される可能性があります。詳細は[OpenAI APIのデータ管理](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)を確認してください。

文章補助は根拠の追加や事実確認を行いません。候補は自動挿入せず、利用者が内容を確認してTabまたは個別の挿入操作で採用します。レート制限は単一Nodeプロセス内で管理するため、複数インスタンスへ展開する場合は共有ストアへ置き換えてください。

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
