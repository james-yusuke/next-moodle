import {
  ChatCircleDots,
  Info,
  PencilSimpleLine,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Notice } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { ConversationDetail, ConversationListItem } from "@/lib/moodle/queries/student";
import { MessageComposer } from "./message-composer";
import "./messages.css";

function ConversationList({ conversations, selectedId }: Readonly<{
  conversations: readonly ConversationListItem[];
  selectedId?: number | undefined;
}>) {
  return (
    <nav aria-label="会話一覧" className="ui-conversation-index">
      {conversations.map((conversation) => (
        <Link aria-current={selectedId === conversation.id ? "page" : undefined} href={`/messages/${conversation.id}`} key={conversation.id}>
          <span className="ui-conversation-index__mark"><ChatCircleDots aria-hidden size={18} /></span>
          <span><strong>{conversation.name}</strong><small>{conversation.preview}</small></span>
          {conversation.unreadCount === 0 ? null : <Badge tone="accent">{conversation.unreadCount}</Badge>}
        </Link>
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
      title={<span className="ui-conversation-context-title">会話<Link aria-label="先生へ新規連絡" className="ui-messages-new" href="/messages/new"><PencilSimpleLine aria-hidden size={18} /></Link></span>}
    >
      {conversations.length === 0 ? (
        <div className="ui-pane-body"><Notice title="会話はありません" tone="info"><p>新規連絡から担当教員へメッセージを送れます。</p></Notice></div>
      ) : <ConversationList conversations={conversations} selectedId={selectedId} />}
    </ContextPanel>
  );
}

export function MessagesIndex({ conversations }: Readonly<{ conversations: readonly ConversationListItem[] }>) {
  return (
    <PageFrame
      className="ui-messages-index-frame"
      content={(
        <div className="ui-messages-placeholder">
          <ChatCircleDots aria-hidden size={34} />
          <h2>会話を選択</h2>
          <p>一覧からスレッドを開くか、担当教員へ新しい連絡を作成してください。</p>
          <Link className="ui-app-action-link" href="/messages/new"><PencilSimpleLine aria-hidden size={17} />先生へ連絡</Link>
        </div>
      )}
      context={<ConversationContext conversations={conversations} />}
      header={<RouteHeader description="授業に関する連絡と返信を、会話ごとに確認します。" eyebrow="COMMUNICATION" title="メッセージ" />}
      mode="conversation"
    />
  );
}

export function ConversationView({ config, conversation, conversations }: Readonly<{
  config: AppRuntimeConfig;
  conversation: ConversationDetail;
  conversations: readonly ConversationListItem[];
}>) {
  const format = new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const participantDetails = (
    <div className="ui-message-participants">
      <ul>{conversation.members.map((member) => <li key={member}>{member}</li>)}</ul>
      <Link className="ui-app-action-link" href="/people">参加者一覧</Link>
    </div>
  );

  return (
    <PageFrame
      className="ui-message-thread-frame"
      content={(
        <section aria-label={`${conversation.name}のメッセージ`} className="ui-message-thread">
          <ol>
            {conversation.messages.map((message) => (
              <li data-own={message.fromCurrentUser ? "true" : undefined} key={message.id}>
                <p>{message.text}</p>
                <time dateTime={new Date(message.time * 1_000).toISOString()}>
                  {message.time === 0 ? "" : format.format(new Date(message.time * 1_000))}
                </time>
              </li>
            ))}
          </ol>
          <MessageComposer conversationId={conversation.id} />
        </section>
      )}
      context={<ConversationContext conversations={conversations} selectedId={conversation.id} />}
      header={(
        <RouteHeader
          actions={<InspectorSheet label={<><Info aria-hidden size={17} />参加者</>} title="参加者">{participantDetails}</InspectorSheet>}
          description={conversation.members.join(" / ")}
          eyebrow="THREAD"
          title={conversation.name}
        />
      )}
      mode="conversation"
    />
  );
}
