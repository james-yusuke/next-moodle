"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type ConversationScrollRegionProps = Readonly<{
  children: ReactNode;
  messageCount: number;
}>;

const BOTTOM_THRESHOLD = 48;

export function ConversationScrollRegion({ children, messageCount }: ConversationScrollRegionProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messageCount);
  const shouldStickToBottomRef = useRef(true);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;

    const hasNewMessage = messageCount > previousMessageCountRef.current;
    if (!initializedRef.current || (hasNewMessage && shouldStickToBottomRef.current)) {
      // Assigning scrollTop avoids a visible route-refresh animation while a
      // learner is sending a reply or opening a conversation for the first time.
      viewport.scrollTop = viewport.scrollHeight;
    }
    previousMessageCountRef.current = messageCount;
    initializedRef.current = true;
  }, [messageCount]);

  return (
    <div
      className="ui-message-thread__scroll"
      onScroll={(event) => {
        const viewport = event.currentTarget;
        shouldStickToBottomRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM_THRESHOLD;
      }}
      ref={viewportRef}
    >
      {children}
    </div>
  );
}
