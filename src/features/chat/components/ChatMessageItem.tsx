import { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../types';
import { Icon } from '../../ui/icons/Icon';
import { Markdown } from '../../ui/markdown/Markdown';
import { ChatSources } from './ChatSources';

import './ChatMessageItem.css';

type ChatMessageItemProps = {
  message: ChatMessage;
  isLast: boolean;
  canRegenerate: boolean;
  canEdit: boolean;
  onOpenSources: (message: ChatMessage) => void;
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onRetryError?: () => void;
};

export function ChatMessageItem({
  message,
  isLast,
  canRegenerate,
  canEdit,
  onOpenSources,
  onCopy,
  onRegenerate,
  onEditAndResend,
  onRetryError,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // reset when the underlying message id changes
  useEffect(() => {
    setEditValue(message.content);
    setIsEditing(false);
    setIsCopied(false);
  }, [message.id, message.content]);

  // auto-grow textarea while editing
  useEffect(() => {
    if (!isEditing) return;
    const el = editRef.current;
    if (!el) return;
    el.focus();
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      onCopy?.(message.content);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      // ignore — best effort
    }
  }

  function handleStartEdit() {
    setEditValue(message.content);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditValue(message.content);
  }

  function handleSubmitEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    onEditAndResend?.(message.id, trimmed);
    setIsEditing(false);
  }

  const showStreamingDots = message.isStreaming && !message.content;

  return (
    <article
      className={
        isUser
          ? 'chat-message chat-message--user'
          : 'chat-message chat-message--assistant'
      }
      data-streaming={message.isStreaming ? 'true' : undefined}
      aria-busy={message.isStreaming || undefined}
    >
      <div className="chat-message__avatar" aria-hidden="true">
        {isUser ? 'U' : 'P'}
      </div>

      <div className="chat-message__content">
        <p className="chat-message__author">
          {isUser ? 'Ty' : 'Korpus'}
          {message.isStreaming ? (
            <span className="chat-message__streaming-tag"> · generuję…</span>
          ) : null}
        </p>

        <div className="chat-message__bubble">
          {isEditing ? (
            <div className="chat-message__edit">
              <textarea
                ref={editRef}
                className="chat-message__edit-field"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelEdit();
                  } else if (
                    (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ||
                    (e.key === 'Enter' && !e.shiftKey)
                  ) {
                    e.preventDefault();
                    handleSubmitEdit();
                  }
                }}
              />
              <div className="chat-message__edit-actions">
                <button
                  type="button"
                  className="chat-message__btn chat-message__btn--ghost"
                  onClick={handleCancelEdit}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="chat-message__btn chat-message__btn--primary"
                  disabled={!editValue.trim()}
                  onClick={handleSubmitEdit}
                >
                  Wyślij ponownie
                </button>
              </div>
            </div>
          ) : (
            <>
              {showStreamingDots ? (
                <div className="chat-message__dots" aria-live="polite" aria-label="Generowanie odpowiedzi">
                  <span /><span /><span />
                </div>
              ) : isUser ? (
                <p className="chat-message__plain">{message.content}</p>
              ) : (
                <>
                  <Markdown content={message.content} />
                  {message.isStreaming ? (
                    <span className="chat-message__caret" aria-hidden="true" />
                  ) : null}
                </>
              )}

              {message.error ? (
                <div className="chat-message__error" role="alert">
                  <span>{message.error}</span>
                  {onRetryError ? (
                    <button
                      type="button"
                      className="chat-message__error-retry"
                      onClick={onRetryError}
                    >
                      <Icon name="refresh" size={14} />
                      <span>Spróbuj ponownie</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        {!isUser && !isEditing && message.sources?.length ? (
          <ChatSources
            sources={message.sources}
            onOpenSources={() => onOpenSources(message)}
          />
        ) : null}

        {!isEditing && !message.isStreaming && message.content ? (
          <div className="chat-message__actions">
            <button
              type="button"
              className="chat-message__action"
              aria-label="Kopiuj treść"
              onClick={handleCopy}
            >
              <Icon name={isCopied ? 'check' : 'copy'} size={14} />
              <span>{isCopied ? 'Skopiowano' : 'Kopiuj'}</span>
            </button>

            {!isUser && isLast && canRegenerate ? (
              <button
                type="button"
                className="chat-message__action"
                aria-label="Regeneruj odpowiedź"
                onClick={onRegenerate}
              >
                <Icon name="refresh" size={14} />
                <span>Regeneruj</span>
              </button>
            ) : null}

            {isUser && canEdit ? (
              <button
                type="button"
                className="chat-message__action"
                aria-label="Edytuj i wyślij ponownie"
                onClick={handleStartEdit}
              >
                <Icon name="edit" size={14} />
                <span>Edytuj</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
