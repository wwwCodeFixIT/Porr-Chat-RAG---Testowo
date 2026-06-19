import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage, ChatSource } from '../types';
import * as chatApi from '../api/chatApi';
import * as history from '../storage/chatHistory';
import { getErrorMessage } from '../../../utils/getErrorMessage';

export type SendOptions = {
  documentIds?: string[];
  /** Używane tuż po utworzeniu nowego chatu, zanim React zdąży przepiąć hook na nowe activeChatId. */
  chatIdOverride?: string;
};

export type ChatMessagesState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  sendMessage: (content: string, options?: SendOptions) => Promise<void>;
  stopGeneration: () => void;
  regenerateLast: (options?: SendOptions) => Promise<void>;
  editAndResend: (
    messageId: string,
    newContent: string,
    options?: SendOptions
  ) => Promise<void>;
  reload: () => Promise<void>;
};

const HISTORY_WINDOW_TURNS = 6;

export function useChatMessages(
  chatId: string | null,
  onError?: (message: string) => void
): ChatMessagesState {
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  /**
   * Synchroniczna flaga "trwa wysyłka". `isSending` to stan Reactowy i aktualizuje
   * się asynchronicznie, więc efekt reagujący na zmianę `chatId` (np. po utworzeniu
   * nowego chatu w trakcie wysyłki) mógłby nadpisać optymistyczne wiadomości
   * pustym wynikiem z bazy. Ref pozwala temu zapobiec natychmiast.
   */
  const sendingRef = useRef(false);
  /** Chat, dla którego trwa właśnie wysyłka — pomija jego ponowne wczytanie. */
  const streamingChatIdRef = useRef<string | null>(null);

  const reportError = useCallback((message: string) => {
    setError(message);
    onErrorRef.current?.(message);
  }, []);

  const reload = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      setError(null);
      return;
    }

    // Nie nadpisuj optymistycznych wiadomości, jeśli właśnie strumieniujemy
    // odpowiedź dla tego chatu (np. tuż po utworzeniu nowej rozmowy).
    if (sendingRef.current && streamingChatIdRef.current === chatId) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await chatApi.getChatMessages(chatId);
      // Po await ponownie sprawdź — wysyłka mogła ruszyć w międzyczasie.
      if (sendingRef.current && streamingChatIdRef.current === chatId) {
        return;
      }
      setMessages(data);
      setError(null);
    } catch (err) {
      reportError(
        getErrorMessage(err, 'Nie udało się wczytać historii rozmowy.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [chatId, reportError]);

  useEffect(() => {
    reload();
  }, [reload]);

  const buildHistoryForBackend = useCallback(
    (
      currentMessages: ChatMessage[]
    ): { role: 'user' | 'assistant'; content: string }[] => {
      const completedTurns = currentMessages.filter(
        (message) => !message.isStreaming && !message.error && message.content
      );

      return completedTurns
        .slice(-HISTORY_WINDOW_TURNS * 2)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));
    },
    []
  );

  const updateMessage = useCallback(
    (messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? updater(message) : message
        )
      );
    },
    []
  );

  const runStream = useCallback(
    async ({
      targetChatId,
      userMessage,
      assistantMessage,
      options,
      historySnapshot,
      appendUserToUi,
      persistUser,
    }: {
      targetChatId: string;
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
      options?: SendOptions;
      historySnapshot: ChatMessage[];
      appendUserToUi: boolean;
      persistUser: boolean;
    }) => {
      const abort = new AbortController();
      abortRef.current = abort;

      sendingRef.current = true;
      streamingChatIdRef.current = targetChatId;

      let finalContent = '';
      let finalSources: ChatSource[] = [];

      try {
        setIsSending(true);
        setError(null);

        setMessages((current) =>
          appendUserToUi
            ? [...current, userMessage, assistantMessage]
            : [...current, assistantMessage]
        );

        if (persistUser) {
          await history.addMessage(userMessage);
        }

        await chatApi.sendChatMessageStream(
          targetChatId,
          {
            message: userMessage.content,
            documentIds: options?.documentIds,
          },
          {
            onDelta: (delta) => {
              finalContent += delta;
              updateMessage(assistantMessage.id, (message) => ({
                ...message,
                content: message.content + delta,
              }));
            },
            onSources: (sources) => {
              finalSources = sources;
              updateMessage(assistantMessage.id, (message) => ({
                ...message,
                sources,
              }));
            },
            onDone: async ({ messageId, createdAt }) => {
              const completed: ChatMessage = {
                ...assistantMessage,
                id: messageId ?? assistantMessage.id,
                createdAt: createdAt ?? assistantMessage.createdAt,
                content: finalContent || assistantMessage.content,
                sources: finalSources.length
                  ? finalSources
                  : assistantMessage.sources,
                isStreaming: false,
              };

              updateMessage(assistantMessage.id, () => completed);

              try {
                await history.addMessage(completed);
              } catch {
                // UI ma już odpowiedź; zapis lokalny jest best-effort.
              }
            },
            onError: (message) => {
              updateMessage(assistantMessage.id, (current) => ({
                ...current,
                isStreaming: false,
                error: message,
              }));
              reportError(message);
            },
          },
          abort.signal,
          buildHistoryForBackend(historySnapshot)
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          const stopped: ChatMessage = {
            ...assistantMessage,
            content: finalContent || assistantMessage.content,
            sources: finalSources.length ? finalSources : assistantMessage.sources,
            isStreaming: false,
          };

          updateMessage(assistantMessage.id, () => stopped);

          // Zapisz to, co zdążyło wygenerować się przed Stopem — bez tego
          // treść zniknie po odświeżeniu, bo reload() czyta tylko IndexedDB.
          try {
            await history.addMessage(stopped);
          } catch {
            // UI ma już treść; zapis lokalny jest best-effort.
          }

          return;
        }

        const message = getErrorMessage(
          err,
          'Nie udało się wygenerować odpowiedzi.'
        );

        updateMessage(assistantMessage.id, (current) => ({
          ...current,
          isStreaming: false,
          error: message,
        }));
        reportError(message);
      } finally {
        setIsSending(false);
        sendingRef.current = false;
        streamingChatIdRef.current = null;
        abortRef.current = null;
      }
    },
    [buildHistoryForBackend, reportError, updateMessage]
  );

  const sendMessage = useCallback(
    async (content: string, options?: SendOptions) => {
      const targetChatId = options?.chatIdOverride ?? chatId;
      if (!targetChatId || isSending) return;

      const trimmed = content.trim();
      if (!trimmed) return;

      const userMessage = history.makeUserMessage(targetChatId, trimmed);
      const assistantMessage = history.makeAssistantMessage(targetChatId);

      await runStream({
        targetChatId,
        userMessage,
        assistantMessage,
        options,
        historySnapshot: messages,
        appendUserToUi: true,
        persistUser: true,
      });
    },
    [chatId, isSending, messages, runStream]
  );

  const stopGeneration = useCallback(() => {
    // Samo abort() wystarczy — await na chatApi.sendChatMessageStream w
    // runStream zakończy się wyjątkiem AbortError, a tamten catch zapisuje
    // częściową odpowiedź do IndexedDB (patrz runStream). Tu tylko czyścimy
    // referencje i UI na wszelki wypadek, gdyby coś zostało w trakcie.
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    streamingChatIdRef.current = null;

    setIsSending(false);
    setMessages((current) =>
      current.map((message) =>
        message.isStreaming ? { ...message, isStreaming: false } : message
      )
    );
  }, []);

  const regenerateLast = useCallback(
    async (options?: SendOptions) => {
      const targetChatId = options?.chatIdOverride ?? chatId;
      if (!targetChatId || isSending) return;

      const assistantIdx = [...messages]
        .map((message, index) => ({ message, index }))
        .reverse()
        .find(({ message }) => message.role === 'assistant')?.index;

      if (assistantIdx === undefined) return;

      let userIdx = assistantIdx - 1;
      while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx -= 1;
      if (userIdx < 0) return;

      const userMessage = messages[userIdx];
      const baseSnapshot = messages.slice(0, assistantIdx);

      setMessages(baseSnapshot);

      try {
        await history.truncateAfter(targetChatId, messages[assistantIdx].createdAt);
      } catch {
        // best-effort
      }

      const assistantMessage = history.makeAssistantMessage(targetChatId);

      await runStream({
        targetChatId,
        userMessage,
        assistantMessage,
        options,
        historySnapshot: baseSnapshot,
        appendUserToUi: false,
        persistUser: false,
      });
    },
    [chatId, isSending, messages, runStream]
  );

  const editAndResend = useCallback(
    async (messageId: string, newContent: string, options?: SendOptions) => {
      const targetChatId = options?.chatIdOverride ?? chatId;
      if (!targetChatId || isSending) return;

      const trimmed = newContent.trim();
      if (!trimmed) return;

      const idx = messages.findIndex((message) => message.id === messageId);
      if (idx === -1 || messages[idx].role !== 'user') return;

      const baseSnapshot = messages.slice(0, idx);
      setMessages(baseSnapshot);

      try {
        await history.truncateAfter(targetChatId, messages[idx].createdAt);
      } catch {
        // best-effort
      }

      const userMessage = history.makeUserMessage(targetChatId, trimmed);
      const assistantMessage = history.makeAssistantMessage(targetChatId);

      await runStream({
        targetChatId,
        userMessage,
        assistantMessage,
        options,
        historySnapshot: baseSnapshot,
        appendUserToUi: true,
        persistUser: true,
      });
    },
    [chatId, isSending, messages, runStream]
  );

  // Abort any in-flight stream only when the hook unmounts. We deliberately do
  // NOT abort on every chatId change: tworząc nowy chat w trakcie pierwszej
  // wysyłki, chatId zmienia się null→id, a wcześniejszy wariant przerywał
  // świeżo utworzony strumień (i odpowiedź nigdy nie dochodziła).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      sendingRef.current = false;
      streamingChatIdRef.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      messages,
      isLoading,
      isSending,
      error,
      sendMessage,
      stopGeneration,
      regenerateLast,
      editAndResend,
      reload,
    }),
    [
      messages,
      isLoading,
      isSending,
      error,
      sendMessage,
      stopGeneration,
      regenerateLast,
      editAndResend,
      reload,
    ]
  );
}
