import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { EmptyState } from './EmptyState';

import './ChatMessageList.css';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
  onOpenSources: (message: ChatMessage) => void;
  onSuggestPrompt?: (prompt: string) => void;
  onRegenerateLast?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onRetryError?: () => void;
  documentCount?: number;
  readyDocumentCount?: number;
  onOpenDocuments?: () => void;
};

/** Próg (px) od dołu, poniżej którego uznajemy, że user „jest na dole”. */
const NEAR_BOTTOM_PX = 120;

export function ChatMessageList({
  messages,
  isSending,
  onOpenSources,
  onSuggestPrompt,
  onRegenerateLast,
  onEditAndResend,
  onRetryError,
  documentCount = 0,
  readyDocumentCount = 0,
  onOpenDocuments,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const prevCountRef = useRef(messages.length);
  /** Czy user świadomie odjechał w górę (wtedy nie przewijamy go na siłę). */
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    userScrolledUpRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    setHasNewBelow(false);
  }, []);

  // Auto-scroll tylko gdy user jest blisko dołu i nie odjechał ręcznie w górę.
  // Inaczej pokaż przycisk „nowe wiadomości”, nie wyrywając go z czytania.
  useEffect(() => {
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;

    if (isAtBottom && !userScrolledUpRef.current) {
      scrollToBottom(isSending ? 'auto' : 'smooth');
    } else if (grew || isSending) {
      setHasNewBelow(true);
    }
  }, [messages, isSending, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    // ruch w górę = świadome odejście od dołu
    if (top < lastScrollTopRef.current - 2) {
      userScrolledUpRef.current = true;
    }
    lastScrollTopRef.current = top;

    const atBottom = checkAtBottom();
    setIsAtBottom(atBottom);
    if (atBottom) {
      userScrolledUpRef.current = false;
      setHasNewBelow(false);
    }
  }, [checkAtBottom]);

  if (messages.length === 0) {
    return (
      <EmptyState
        disabled={isSending}
        documentCount={documentCount}
        readyDocumentCount={readyDocumentCount}
        onOpenDocuments={onOpenDocuments}
        onSuggest={(prompt) => onSuggestPrompt?.(prompt)}
      />
    );
  }

  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div className="chat-message-list-shell">
      <section
        ref={scrollRef}
        className="chat-message-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Historia wiadomości"
        onScroll={handleScroll}
      >
        <div className="chat-message-list__inner">
          {messages.map((message, index) => {
            const isLastAssistant =
              message.role === 'assistant' && index === lastAssistantIndex;

            return (
              <ChatMessageItem
                key={message.id}
                message={message}
                isLast={isLastAssistant}
                canRegenerate={!isSending}
                canEdit={!isSending}
                onOpenSources={onOpenSources}
                onRegenerate={onRegenerateLast}
                onEditAndResend={onEditAndResend}
                onRetryError={onRetryError}
              />
            );
          })}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </section>

      {hasNewBelow ? (
        <button
          type="button"
          className="chat-message-list__jump"
          onClick={() => scrollToBottom('smooth')}
          aria-label="Przewiń do najnowszej wiadomości"
        >
          <span aria-hidden="true">↓</span>
          Nowe wiadomości
        </button>
      ) : null}
    </div>
  );
}
