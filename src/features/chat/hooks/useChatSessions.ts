import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatSession } from '../types';
import * as chatApi from '../api/chatApi';
import { getErrorMessage } from '../../../utils/getErrorMessage';

export type ChatSessionsState = {
  chats: ChatSession[];
  activeChatId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  actionId: string | null;
  error: string | null;

  selectChat: (chatId: string | null) => void;
  createChat: () => Promise<string | null>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  togglePinChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  reloadChats: () => Promise<void>;
};

export type UseChatSessionsOptions = {
  onError?: (message: string) => void;
  onSuccess?: (title: string) => void;
};

function sortChats(chats: ChatSession[]) {
  return [...chats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function useChatSessions(
  options: UseChatSessionsOptions = {}
): ChatSessionsState {
  const callbacksRef = useRef(options);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    callbacksRef.current.onError?.(message);
  }, []);

  const handleSuccess = useCallback((title: string) => {
    callbacksRef.current.onSuccess?.(title);
  }, []);

  const reloadChats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = sortChats(await chatApi.getChats());
      setChats(data);
      setActiveChatId((current) =>
        current && data.some((chat) => chat.id === current)
          ? current
          : data[0]?.id ?? null
      );
      setError(null);
    } catch (err) {
      handleError(
        getErrorMessage(err, 'Nie udało się wczytać historii rozmów.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    reloadChats();
  }, [reloadChats]);

  const createChat = useCallback(async (): Promise<string | null> => {
    if (isCreating) return null;

    try {
      setIsCreating(true);
      const created = await chatApi.createChat();

      setChats((current) => sortChats([created, ...current]));
      setActiveChatId(created.id);
      setError(null);

      return created.id;
    } catch (err) {
      handleError(getErrorMessage(err, 'Nie udało się utworzyć rozmowy.'));
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, handleError]);

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      const normalized = title.trim();
      if (!normalized) return;

      try {
        setActionId(chatId);
        const updated = await chatApi.updateChatTitle(chatId, {
          title: normalized,
        });

        setChats((current) =>
          sortChats(current.map((chat) => (chat.id === chatId ? updated : chat)))
        );
        setError(null);
        handleSuccess('Nazwa rozmowy została zmieniona.');
      } catch (err) {
        handleError(
          getErrorMessage(err, 'Nie udało się zmienić nazwy rozmowy.')
        );
      } finally {
        setActionId(null);
      }
    },
    [handleError, handleSuccess]
  );

  const togglePinChat = useCallback(
    async (chatId: string) => {
      const existing = chats.find((chat) => chat.id === chatId);
      const nextPinned = !existing?.pinned;

      try {
        setActionId(chatId);
        const updated = await chatApi.setChatPinned(chatId, nextPinned);
        setChats((current) =>
          sortChats(current.map((chat) => (chat.id === chatId ? updated : chat)))
        );
        setError(null);
        handleSuccess(nextPinned ? 'Rozmowa przypięta.' : 'Rozmowa odpięta.');
      } catch (err) {
        handleError(getErrorMessage(err, 'Nie udało się przypiąć rozmowy.'));
      } finally {
        setActionId(null);
      }
    },
    [chats, handleError, handleSuccess]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        setActionId(chatId);
        await chatApi.deleteChat(chatId);

        setChats((current) => {
          const deletedIndex = current.findIndex((chat) => chat.id === chatId);
          const next = current.filter((chat) => chat.id !== chatId);

          if (activeChatId === chatId) {
            const nextActive =
              next[deletedIndex] ?? next[deletedIndex - 1] ?? next[0] ?? null;
            setActiveChatId(nextActive?.id ?? null);
          }

          return next;
        });

        setError(null);
        handleSuccess('Rozmowa została usunięta.');
      } catch (err) {
        handleError(getErrorMessage(err, 'Nie udało się usunąć rozmowy.'));
      } finally {
        setActionId(null);
      }
    },
    [activeChatId, handleError, handleSuccess]
  );

  const selectChat = useCallback((chatId: string | null) => {
    setActiveChatId(chatId);
  }, []);

  return useMemo(
    () => ({
      chats,
      activeChatId,
      isLoading,
      isCreating,
      actionId,
      error,
      selectChat,
      createChat,
      renameChat,
      togglePinChat,
      deleteChat,
      reloadChats,
    }),
    [
      chats,
      activeChatId,
      isLoading,
      isCreating,
      actionId,
      error,
      selectChat,
      createChat,
      renameChat,
      togglePinChat,
      deleteChat,
      reloadChats,
    ]
  );
}
