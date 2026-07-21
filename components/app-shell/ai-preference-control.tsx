"use client";

import { Button } from "@/components/ui";
import { useAiConsent } from "@/components/assignments/use-ai-consent";

type AiPreferenceControlProps = Readonly<{
  available: boolean;
  consentStorageKey: string;
}>;

export function AiPreferenceControl({
  available,
  consentStorageKey,
}: AiPreferenceControlProps) {
  const consent = useAiConsent(consentStorageKey);

  return (
    <section className="ui-app-ai-preference" aria-label="AI文章補助の設定">
      <div>
        <strong>AI文章補助</strong>
        <p>
          {!available
            ? "この環境では無効です。"
            : consent.state === "granted"
              ? "この端末で同意済みです。"
              : "課題エディタで同意すると利用できます。"}
        </p>
      </div>
      {available && consent.state === "granted" ? (
        <Button onClick={consent.revoke} size="compact" type="button" variant="ghost">
          停止して同意を削除
        </Button>
      ) : null}
    </section>
  );
}
