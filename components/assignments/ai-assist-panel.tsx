"use client";

import { ArrowCounterClockwise, Sparkle, StopCircle } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useState } from "react";

import { Button, Notice } from "@/components/ui";
import type { AiAvailability } from "@/lib/ai/config";
import { AiReviewResponseSchema } from "@/lib/ai/contracts";
import type { AiReviewResult } from "@/lib/ai/context";
import type { AiTextFormat } from "@/lib/ai/contracts";
import type { AiConsentState } from "./use-ai-consent";

type AiAssistPanelProps = Readonly<{
  availability: AiAvailability;
  canUndo: boolean;
  cmid: number;
  consentState: AiConsentState;
  excerpt: string;
  format: AiTextFormat;
  onGrant: () => void;
  onInsert: (value: string) => void;
  onRevoke: () => void;
  onUndo: () => void;
  submitting: boolean;
}>;

function errorCopy(code: string): string {
  switch (code) {
    case "ai_rate_limited": return "利用回数の上限に達しました。1分ほど待ってから再度お試しください。";
    case "ai_request_in_progress": return "別の文章補助を処理中です。完了後に再度お試しください。";
    case "ai_refused": return "この内容への補助案は生成できませんでした。文章を見直して再度お試しください。";
    case "ai_timeout": return "文章補助が時間内に完了しませんでした。入力は保持されています。";
    case "ai_assignment_unsupported": return "この課題では文章補助を利用できません。";
    case "authentication_failed": return "セッションが終了しました。再ログインしてください。";
    default: return "文章補助へ接続できません。入力は保持されています。";
  }
}

export function AiAssistPanel(props: AiAssistPanelProps) {
  const [pending, setPending] = useState<"gaps" | "paragraphs" | null>(null);
  const [result, setResult] = useState<AiReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!props.availability.enabled) {
    return (
      <aside className="ui-ai-panel" aria-labelledby="ai-panel-title">
        <div className="ui-ai-panel__heading"><Sparkle aria-hidden size={19} /><h3 id="ai-panel-title">文章補助</h3></div>
        <p>この環境では文章補助が無効です。提出機能はそのまま利用できます。</p>
      </aside>
    );
  }

  if (props.consentState !== "granted") {
    return (
      <aside className="ui-ai-panel" aria-labelledby="ai-consent-title">
        <div className="ui-ai-panel__heading"><Sparkle aria-hidden size={19} /><h3 id="ai-consent-title">文章補助を有効にする</h3></div>
        <p>課題名、プレーンテキスト化した課題文、カーソル周辺または選択した文章だけをOpenAIへ送信します。氏名、Moodleトークン、添付ファイル、コース一覧、全文下書きは送信しません。</p>
        <p><code>store: false</code>を使用しますが、Zero Data Retention契約がない通常環境では、不正利用監視ログが最大30日保持される場合があります。</p>
        {props.availability.privacyNoticeUrl === undefined ? null : (
          <a href={props.availability.privacyNoticeUrl} rel="noopener noreferrer" target="_blank">プライバシー説明を開く</a>
        )}
        <Button disabled={props.consentState === "loading"} onClick={props.onGrant} type="button" variant="primary">内容を確認して有効化</Button>
      </aside>
    );
  }

  const requestReview = async (intent: "gaps" | "paragraphs") => {
    setPending(intent);
    setError(null);
    try {
      const response = await ky.post(`/api/assignments/${props.cmid}/ai/review`, {
        json: { excerpt: props.excerpt.slice(0, 6_000), format: props.format, intent },
        headers: { "x-ai-consent": "1" },
        retry: 0,
        throwHttpErrors: false,
        timeout: 21_000,
      });
      const parsed = AiReviewResponseSchema.safeParse(await response.json<unknown>());
      if (!parsed.success) {
        setError("ai_unavailable");
        return;
      }
      if (!parsed.data.ok) {
        setError(parsed.data.error.code);
        return;
      }
      setResult(parsed.data.result);
    } catch (caught) {
      if (isKyError(caught) || caught instanceof SyntaxError) {
        setError("ai_unavailable");
        return;
      }
      throw caught;
    } finally {
      setPending(null);
    }
  };

  const reviewDisabled = props.submitting || props.excerpt.trim().length < 24;
  return (
    <aside className="ui-ai-panel" aria-labelledby="ai-panel-title">
      <div className="ui-ai-panel__heading">
        <Sparkle aria-hidden size={19} />
        <h3 id="ai-panel-title">文章補助</h3>
        <button aria-label="文章補助を停止して同意を削除" onClick={props.onRevoke} type="button"><StopCircle aria-hidden size={18} /></button>
      </div>
      <p>補助案は現在の文章だけをもとに作成します。事実確認や採点は行いません。</p>
      <div className="ui-ai-panel__actions">
        <Button disabled={reviewDisabled || pending !== null} loading={pending === "gaps"} onClick={() => void requestReview("gaps")} type="button" variant="secondary">不足点を確認</Button>
        <Button disabled={reviewDisabled || pending !== null} loading={pending === "paragraphs"} onClick={() => void requestReview("paragraphs")} type="button" variant="secondary">補足段落を作る</Button>
      </div>
      {error === null ? null : <Notice title="文章補助を完了できません" tone="warning"><p>{errorCopy(error)}</p></Notice>}
      {result === null ? null : (
        <div className="ui-ai-result" aria-live="polite">
          {result.summary === "" ? null : <p>{result.summary}</p>}
          {result.gaps.length === 0 ? null : <ul>{result.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>}
          {result.paragraphs.map((paragraph, index) => (
            <article key={`${index}-${paragraph.slice(0, 24)}`}>
              <p>{paragraph}</p>
              <Button onClick={() => props.onInsert(paragraph)} type="button" variant="ghost">この段落を挿入</Button>
            </article>
          ))}
        </div>
      )}
      {props.canUndo ? (
        <Button icon={<ArrowCounterClockwise aria-hidden size={17} />} onClick={props.onUndo} type="button" variant="ghost">直前のAI挿入を元に戻す</Button>
      ) : null}
    </aside>
  );
}
