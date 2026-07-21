"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Textarea } from "@/components/ui";

export function MessageComposer({ conversationId }: Readonly<{ conversationId: number }>) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  async function submit(): Promise<void> {
    if (text.trim() === "" || status === "sending") return;
    setStatus("sending");
    try {
      const response = await ky.post(`/api/messages/${conversationId}`, {
        json: { text },
        retry: 0,
        throwHttpErrors: false,
        timeout: 15_000,
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }
    } catch (error) {
      if (!isKyError(error)) throw error;
      setStatus("error");
      return;
    }
    setText("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="ui-message-composer">
      <Textarea label="メッセージ" maxLength={10_000} onChange={(event) => setText(event.currentTarget.value)} placeholder="メッセージを入力" rows={2} value={text} />
      <Button disabled={text.trim() === "" || status === "sending"} onClick={submit} type="button"><PaperPlaneRight aria-hidden size={18} />{status === "sending" ? "送信中" : "送信"}</Button>
      <span aria-live="polite">{status === "error" ? "送信できませんでした。入力は保持されています。" : ""}</span>
    </div>
  );
}
