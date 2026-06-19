import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';

import { Icon } from '../../ui/icons/Icon';

import './ChatInput.css';

/** Maksymalna długość pojedynczego pytania (ochrona kontekstu backendu). */
const MAX_CHARS = 4000;
/** Od ilu znaków pokazujemy licznik. */
const COUNTER_VISIBLE_FROM = 3000;

type ChatInputProps = {
  disabled?: boolean;
  isSending?: boolean;
  isCreatingChat?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onSendMessage: (content: string) => void;
  onStopGeneration: () => void;
};

export function ChatInput({
  disabled = false,
  isSending = false,
  isCreatingChat = false,
  inputRef,
  onSendMessage,
  onStopGeneration,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const isDisabled = disabled || isCreatingChat;
  const isOverLimit = value.length > MAX_CHARS;
  const canSubmit =
    Boolean(value.trim()) && !isDisabled && !isSending && !isOverLimit;
  const showCounter = value.length >= COUNTER_VISIBLE_FROM;

  // auto-grow do limitu
  useEffect(() => {
    const el = (inputRef?.current ?? internalRef.current);
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, inputRef]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isDisabled || isSending || isOverLimit) return;
    onSendMessage(trimmed);
    setValue('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="chat-input__field-wrap">
        <label className="sr-only" htmlFor="chat-message">
          Wpisz pytanie do dokumentacji
        </label>

        <textarea
          id="chat-message"
          ref={(el) => {
            internalRef.current = el;
            if (inputRef) {
              (inputRef as MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }
          }}
          className="chat-input__field"
          value={value}
          rows={1}
          disabled={isDisabled || isSending}
          aria-invalid={isOverLimit || undefined}
          aria-describedby="chat-input-hint"
          placeholder={
            isCreatingChat
              ? 'Tworzenie rozmowy…'
              : 'Zapytaj o dokumentację PORR — Korpus odpowie ze źródłami…'
          }
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="chat-input__meta">
          <p className="chat-input__hint" id="chat-input-hint">
            <kbd>Enter</kbd> wysyła wiadomość, <kbd>Shift</kbd> + <kbd>Enter</kbd> dodaje nową linię.
          </p>

          {showCounter ? (
            <span
              className={
                isOverLimit
                  ? 'chat-input__counter chat-input__counter--over'
                  : 'chat-input__counter'
              }
              aria-live="polite"
            >
              {value.length} / {MAX_CHARS}
            </span>
          ) : null}
        </div>
      </div>

      <div className="chat-input__actions">
        {isSending ? (
          <button
            className="chat-input__stop"
            type="button"
            aria-label="Przerwij generowanie odpowiedzi"
            onClick={onStopGeneration}
          >
            <Icon name="stop" size={17} />
            <span>Stop</span>
          </button>
        ) : null}

        <button
          className="chat-input__send"
          type="submit"
          aria-label={isSending ? 'Generowanie odpowiedzi' : 'Wyślij wiadomość'}
          disabled={!canSubmit}
        >
          {isSending ? (
            <span>Generowanie…</span>
          ) : (
            <>
              <Icon name="send" size={17} />
              <span>Wyślij</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
