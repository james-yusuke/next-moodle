"use client";

import { PaperPlaneRight } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";

const MAX_MESSAGE_LENGTH = 10_000;
const COMPOSER_MAX_HEIGHT = 160;

export function MessageComposer({ conversationId }: Readonly<{ conversationId: number }>) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "forbidden">("idle");
  const messageId = `conversation-${conversationId}-message`;
  const hintId = `${messageId}-hint`;
  const statusId = `${messageId}-status`;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
    textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
  }, [text]);

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
        setStatus(response.status === 403 ? "forbidden" : "error");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }
    setText("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <form className="ui-message-composer" onSubmit={(event) => {
      event.preventDefault();
      void submit();
    }}>
      <label className="ui-message-composer__label" htmlFor={messageId}>メッセージ</label>
      <textarea
        aria-describedby={`${hintId} ${statusId}`}
        aria-invalid={status === "error" || status === "forbidden"}
        autoComplete="off"
        className="ui-message-composer__input"
        enterKeyHint="enter"
        id={messageId}
        maxLength={MAX_MESSAGE_LENGTH}
        name="message"
        onChange={(event) => {
          setText(event.currentTarget.value);
          if (status !== "idle") setStatus("idle");
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
          event.preventDefault();
          void submit();
        }}
        placeholder="メッセージを入力"
        ref={textareaRef}
        rows={2}
        value={text}
      />
      <div className="ui-message-composer__footer">
        <span id={hintId}>Enterで改行 · ⌘ / Ctrl + Enterで送信</span>
        <span aria-live="polite" className="ui-message-composer__count">{text.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}</span>
        <Button disabled={text.trim() === "" || status === "sending"} icon={<PaperPlaneRight aria-hidden size={18} />} loading={status === "sending"} type="submit" variant="primary">送信</Button>
      </div>
      <p aria-live="polite" className="ui-message-composer__status" id={statusId}>
        {status === "forbidden" ? "アクセスが禁止されています。入力内容は保持されています。" : status === "error" ? "送信できませんでした。入力内容は保持されています。" : ""}
      </p>
    </form>
  );
}
