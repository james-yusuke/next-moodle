import styles from "./messages-view.module.css";
import {
  ChatCircleDots,
  Info,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, EmptyState } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import type { ConversationDetail, ConversationListItem } from "@/lib/moodle/queries/student";
import { ConversationScrollRegion } from "./conversation-scroll-region";
import { MessageComposer } from "./message-composer";
import { ConversationReadReceipt } from "./conversation-read-receipt";

function ConversationList({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <nav aria-label="会話一覧" className={styles.conversationIndex!}>
      {conversations.map((conversation) => (
        <TransitionLink aria-current={selectedId === conversation.id ? "page" : undefined} className={styles.style1!} href={`/messages/${conversation.id}`} intent="drill-in" key={conversation.id}>
          {selectedId === conversation.id ? <span aria-hidden className={styles.style2!} /> : null}
          <span className={styles.conversationIndexMark!} data-testid="conversation-icon"><ChatCircleDots aria-hidden className={styles.style3!} size={18} /></span>
          <span className={styles.style4!}>
            {selectedId === conversation.id ? <strong className={styles.style5!}>{conversation.name}</strong> : <SharedTransition identifier={conversation.id} kind="conversation"><strong className={styles.style6!}>{conversation.name}</strong></SharedTransition>}
            <small className={styles.style7!}>{conversation.preview}</small>
          </span>
          {conversation.unreadCount === 0 ? null : <span aria-label={`${conversation.unreadCount}件の未読メッセージ`}><Badge tone="accent">{conversation.unreadCount}</Badge></span>}
        </TransitionLink>
      ))}
    </nav>
  );
}

function ConversationContext({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <ContextPanel
      count={conversations.length}
      storageKey="messages"
      title={<span className={styles.conversationContextTitle!}>会話<TransitionLink aria-label="新しいメッセージ" className={styles.messagesNew!} href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={18} /></TransitionLink></span>}
    >
      {conversations.length === 0 ? (
        <div className={styles.paneBody!}><EmptyState icon={<ChatCircleDots aria-hidden size={20} />} title="会話はありません">新しいメッセージから先生や学生と会話を始められます。</EmptyState></div>
      ) : <ConversationList conversations={conversations} selectedId={selectedId} />}
    </ContextPanel>
  );
}

function MessageTime({ format, time }: Readonly<{ format: Intl.DateTimeFormat; time: number }>) {
  // PHP accepts a broad integer range for Moodle timestamps. Do not let a
  // malformed upstream value make a whole conversation unrenderable in JS.
  if (!Number.isSafeInteger(time) || time <= 0 || time > 8_640_000_000_000) return null;
  const date = new Date(time * 1_000);
  if (Number.isNaN(date.valueOf())) return null;
  return <time className={styles.style8!} dateTime={date.toISOString()}>{format.format(date)}</time>;
}

export function MessagesIndex({ conversations }: Readonly<{ conversations: readonly ConversationListItem[] }>) {
  return (
    <PageFrame
      className={styles.messagesIndexFrame!}
      content={(
        <EmptyState className={styles.style9!} action={<TransitionLink appearance="action" className={styles.appActionLink!} href="/messages/new" intent="drill-in"><PencilSimpleLine aria-hidden size={17} />新しいメッセージ</TransitionLink>} icon={<ChatCircleDots aria-hidden size={26} />} title="会話を選択">一覧からスレッドを開くか、先生や学生との新しい会話を作成してください。</EmptyState>
      )}
      context={<ConversationContext conversations={conversations} />}
      header={<RouteHeader description="授業に関する連絡と返信を、会話ごとに確認します。" eyebrow="COMMUNICATION" title="メッセージ" />}
      mobileView="context"
      mode="conversation"
      width="full"
    />
  );
}

export function ConversationView({ canMarkRead, config, conversation, conversations }: Readonly<{
  canMarkRead: boolean;
  config: AppRuntimeConfig;
  conversation: ConversationDetail;
  conversations: readonly ConversationListItem[];
}>) {
  const format = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const participantDetails = (
    <div className={styles.messageParticipants!}>
      <ul className={styles.style10!}>{conversation.members.map((member) => <li className={styles.style11!} key={member}>{member}</li>)}</ul>
      <TransitionLink appearance="action" className={styles.appActionLink!} href="/people" intent="switch">参加者一覧</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      className={styles.messageThreadFrame!}
      content={(
        <section aria-label={`${conversation.name}の会話履歴`} className={styles.messageThread!} data-testid="message-thread">
          {canMarkRead ? <ConversationReadReceipt conversationId={conversation.id} unread={conversation.unreadCount > 0} /> : null}
          <ConversationScrollRegion key={conversation.id} messageCount={conversation.messages.length}>
            <ol className={styles.style12!}>
              {conversation.messages.map((message) => (
                <li className={styles.style13!} data-own={message.fromCurrentUser ? "true" : undefined} key={message.id}>
                  <p className={styles.style14!}>{message.text}</p>
                  <MessageTime format={format} time={message.time} />
                </li>
              ))}
            </ol>
          </ConversationScrollRegion>
          <MessageComposer conversationId={conversation.id} />
        </section>
      )}
      context={<ConversationContext conversations={conversations} selectedId={conversation.id} />}
      header={(
        <RouteHeader
          actions={<InspectorSheet label={<><Info aria-hidden size={17} />参加者</>} title="参加者">{participantDetails}</InspectorSheet>}
          description={conversation.members.join(" / ")}
          eyebrow="THREAD"
          shared={{ identifier: conversation.id, kind: "conversation" }}
          title={conversation.name}
        />
      )}
      mode="conversation"
      width="full"
    />
  );
}
