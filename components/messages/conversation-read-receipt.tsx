"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ConversationReadReceipt({ conversationId, unread }: Readonly<{
  conversationId: number;
  unread: boolean;
}>) {
  const router = useRouter();

  useEffect(() => {
    if (!unread) return;
    const controller = new AbortController();
    void fetch(`/api/messages/${conversationId}/read`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) router.refresh();
    }).catch(() => undefined);
    return () => controller.abort();
  }, [conversationId, router, unread]);

  return null;
}
