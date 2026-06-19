/**
 * Klient-side warstwa historii czatu — pełna obsługa rozmów i wiadomości
 * po stronie przeglądarki w IndexedDB. Backend RAG jest BEZSTANOWY w tym modelu:
 * przy każdym pytaniu klient wysyła pytanie + wymaganą historię, a wynik
 * zapisuje lokalnie.
 *
 * Typy `ChatSession` i `ChatMessage` zostają z `../types`, ale tutaj
 * rozszerzamy `ChatSession` o pole opcjonalne `pinned` (sortowanie w sidebarze).
 */

import type { ChatMessage, ChatSession } from '../types';
import {
  STORE_CHATS,
  STORE_MESSAGES,
  bulkPut,
  delByKey,
  getAll,
  getByKey,
  put,
  reqAsPromise,
  tx,
} from './idb';

export type StoredChatSession = ChatSession & {
  pinned?: boolean;
  /** Pierwsze pytanie użytkownika — pomocne przy generowaniu tytułów. */
  firstMessage?: string;
};

export type StoredChatMessage = ChatMessage;

function now() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  return `${prefix}_${uuid}`;
}

/* -------------------- chats -------------------- */

export async function listChats(): Promise<StoredChatSession[]> {
  const chats = await getAll<StoredChatSession>(STORE_CHATS);

  // Pinned first, then newest first.
  return chats.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function createChat(initialTitle = 'Nowa rozmowa'): Promise<StoredChatSession> {
  const timestamp = now();
  const chat: StoredChatSession = {
    id: newId('chat'),
    title: initialTitle,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return put<StoredChatSession>(STORE_CHATS, chat);
}

export async function getChat(chatId: string): Promise<StoredChatSession | undefined> {
  return getByKey<StoredChatSession>(STORE_CHATS, chatId);
}

export async function updateChat(
  chatId: string,
  patch: Partial<Omit<StoredChatSession, 'id' | 'createdAt'>>
): Promise<StoredChatSession> {
  const existing = await getChat(chatId);

  if (!existing) {
    throw new Error('Nie znaleziono rozmowy.');
  }

  const merged: StoredChatSession = {
    ...existing,
    ...patch,
    updatedAt: now(),
  };

  return put<StoredChatSession>(STORE_CHATS, merged);
}

export async function setChatPinned(
  chatId: string,
  pinned: boolean
): Promise<StoredChatSession> {
  return updateChat(chatId, { pinned });
}

export async function renameChat(
  chatId: string,
  title: string
): Promise<StoredChatSession> {
  return updateChat(chatId, { title });
}

/**
 * Usuwa rozmowę i wszystkie jej wiadomości — atomowo, w jednej transakcji.
 */
export async function deleteChat(chatId: string): Promise<void> {
  return tx<void>(
    [STORE_CHATS, STORE_MESSAGES],
    'readwrite',
    async (stores) => {
      await reqAsPromise(stores[STORE_CHATS].delete(chatId));

      const index = stores[STORE_MESSAGES].index('byChatId');
      const cursorReq = index.openCursor(IDBKeyRange.only(chatId));

      await new Promise<void>((resolve, reject) => {
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) {
            resolve();
            return;
          }
          cursor.delete();
          cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      });
    }
  );
}

export async function clearAllChats(): Promise<void> {
  return tx<void>(
    [STORE_CHATS, STORE_MESSAGES],
    'readwrite',
    async (stores) => {
      await reqAsPromise(stores[STORE_CHATS].clear());
      await reqAsPromise(stores[STORE_MESSAGES].clear());
    }
  );
}

/* -------------------- messages -------------------- */

export async function listMessages(chatId: string): Promise<StoredChatMessage[]> {
  const messages = await getAll<StoredChatMessage>(STORE_MESSAGES, {
    index: 'byChatIdAndCreated',
    query: IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']),
  });

  return messages;
}

export async function addMessage(
  message: StoredChatMessage
): Promise<StoredChatMessage> {
  await put(STORE_MESSAGES, message);

  // bump chat.updatedAt + auto-title z pierwszej wiadomości użytkownika
  if (message.role === 'user') {
    const chat = await getChat(message.chatId);

    if (chat) {
      const isFirst = !chat.firstMessage;
      const trimmed = message.content.trim().slice(0, 60);

      await put<StoredChatSession>(STORE_CHATS, {
        ...chat,
        firstMessage: chat.firstMessage ?? trimmed,
        title:
          isFirst && (chat.title === 'Nowa rozmowa' || !chat.title)
            ? trimmed || chat.title
            : chat.title,
        updatedAt: now(),
      });
    }
  } else {
    const chat = await getChat(message.chatId);
    if (chat) {
      await put<StoredChatSession>(STORE_CHATS, {
        ...chat,
        updatedAt: now(),
      });
    }
  }

  return message;
}

export async function updateMessage(
  messageId: string,
  patch: Partial<StoredChatMessage>
): Promise<StoredChatMessage | undefined> {
  const existing = await getByKey<StoredChatMessage>(STORE_MESSAGES, messageId);
  if (!existing) return undefined;

  const merged = { ...existing, ...patch };
  await put(STORE_MESSAGES, merged);

  return merged;
}

export async function deleteMessage(messageId: string): Promise<void> {
  return delByKey(STORE_MESSAGES, messageId);
}

/**
 * Usuwa wiadomość i wszystkie po niej w tej rozmowie (truncate after).
 * Używane przy „regeneruj" i „edytuj i wyślij ponownie" — chcemy uciąć
 * wiadomości po wybranym punkcie, bo dalsza historia stanie się niespójna.
 */
export async function truncateAfter(
  chatId: string,
  fromCreatedAt: string
): Promise<void> {
  return tx<void>(STORE_MESSAGES, 'readwrite', async (stores) => {
    const index = stores[STORE_MESSAGES].index('byChatIdAndCreated');
    const range = IDBKeyRange.bound(
      [chatId, fromCreatedAt],
      [chatId, '\uffff']
    );
    const cursorReq = index.openCursor(range);

    await new Promise<void>((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  });
}

/* -------------------- helpers -------------------- */

export function makeUserMessage(
  chatId: string,
  content: string
): StoredChatMessage {
  return {
    id: newId('msg_u'),
    chatId,
    role: 'user',
    content,
    createdAt: now(),
  };
}

export function makeAssistantMessage(
  chatId: string,
  initialContent = ''
): StoredChatMessage {
  return {
    id: newId('msg_a'),
    chatId,
    role: 'assistant',
    content: initialContent,
    sources: [],
    isStreaming: true,
    createdAt: now(),
  };
}

/**
 * Bulk save — wykorzystywane przez import lub re-sync po stronie ChatShell.
 */
export async function bulkSaveMessages(
  messages: StoredChatMessage[]
): Promise<void> {
  return bulkPut(STORE_MESSAGES, messages);
}

/**
 * Eksport historii do JSON-a (np. do przeniesienia między urządzeniami).
 */
export async function exportAllAsJson(): Promise<string> {
  const chats = await listChats();
  const messages: StoredChatMessage[] = [];

  for (const chat of chats) {
    const chatMessages = await listMessages(chat.id);
    messages.push(...chatMessages);
  }

  return JSON.stringify(
    {
      exportedAt: now(),
      chats,
      messages,
    },
    null,
    2
  );
}

export async function importFromJson(payload: string): Promise<void> {
  const data = JSON.parse(payload) as {
    chats?: StoredChatSession[];
    messages?: StoredChatMessage[];
  };

  return tx<void>(
    [STORE_CHATS, STORE_MESSAGES],
    'readwrite',
    async (stores) => {
      for (const chat of data.chats ?? []) {
        await reqAsPromise(stores[STORE_CHATS].put(chat));
      }
      for (const message of data.messages ?? []) {
        await reqAsPromise(stores[STORE_MESSAGES].put(message));
      }
    }
  );
}

const LEGACY_DEMO_CHAT_PATTERNS = [
  'Streść kluczowe wymagania EIR',
  'Modele Powykonawczy',
  'P00100045-CPK-IBI',
  'Wymagania_wymiany_informacji_EIR',
];

function isLegacyDemoChat(chat: StoredChatSession) {
  const haystack = `${chat.title ?? ''} ${chat.firstMessage ?? ''}`;

  return LEGACY_DEMO_CHAT_PATTERNS.some((pattern) =>
    haystack.includes(pattern)
  );
}

/**
 * Jednorazowe czyszczenie starych danych demonstracyjnych z wcześniejszych buildów.
 * Nie usuwa normalnych rozmów użytkownika — celuje tylko w znane seed/test frazy.
 */
export async function cleanupLegacyDemoChats(): Promise<number> {
  const chats = await listChats();
  const legacyChats = chats.filter(isLegacyDemoChat);

  for (const chat of legacyChats) {
    await deleteChat(chat.id);
  }

  return legacyChats.length;
}
