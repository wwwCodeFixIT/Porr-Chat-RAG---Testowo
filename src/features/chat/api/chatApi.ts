/**
 * Warstwa API:
 *
 *  • CHATY i WIADOMOŚCI — wyłącznie po stronie klienta (IndexedDB).
 *    Backend RAG jest BEZSTANOWY: nie zna ID rozmowy ani nie pamięta historii.
 *    Klient wysyła pytanie + krótką historię (ostatnie N wymian),
 *    a wynik (treść, źródła) zapisuje lokalnie.
 *
 *  • DOKUMENTY i FOLDERY — pozostają po stronie backendu (wspólne dla zespołu).
 *    Gdy `VITE_USE_MOCK_API=true`, używany jest `mockChatApi` (localStorage).
 *
 *  • STREAM RAG obsługuje dwa formaty:
 *    1) natywny frontendowy: event: message.delta/message.sources/message.done,
 *    2) mock_app z FastAPI: data: { type: "answer" | "sources" | "done" | "error", ... }.
 */

import type {
  ChatMessage,
  ChatSession,
  ChatSource,
  CreateDocumentFolderPayload,
  DocumentDetails,
  DocumentFolder,
  DocumentItem,
  GetDocumentFoldersResponse,
  GetDocumentsResponse,
  MoveDocumentPayload,
  SendMessagePayload,
  UpdateChatPayload,
  UpdateDocumentFolderPayload,
} from '../types';

import * as history from '../storage/chatHistory';
import * as mockChatApi from './mockChatApi';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const USE_MOCK_STREAM = import.meta.env.VITE_USE_MOCK_STREAM === 'true';

const RAG_STREAM_PATH =
  import.meta.env.VITE_RAG_STREAM_PATH ?? '/api/chats/messages/stream';
const RAG_STREAM_PROTOCOL =
  import.meta.env.VITE_RAG_STREAM_PROTOCOL ?? 'auto';

/* Ile par „pytanie/odpowiedź" wysyłamy do bezstanowego backendu jako kontekst. */
const HISTORY_WINDOW_TURNS = 6;

type BackendHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type StreamEventData = {
  type?: string;
  content?: string;
  message?: string;
  error?: string;
  sources?: unknown[];
  messageId?: string;
  createdAt?: string;
};

type RawSourceInfo = {
  documentId?: string;
  document_id?: string;
  fileName?: string;
  filename?: string;
  file_name?: string;
  sourcePath?: string;
  source_path?: string;
  excerpt?: string;
  quote?: string;
  text?: string;
  content?: string;
  score?: number;
  page?: number;
  chunkId?: string;
  chunk_id?: string;
};

async function getApiErrorMessage(response: Response) {
  try {
    const data = await response.json();

    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;

    return `API error: ${response.status}`;
  } catch {
    return `API error: ${response.status}`;
  }
}

async function request<TResponse>(
  path: string,
  options?: RequestInit
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function parseStreamEventData(rawData: string): StreamEventData | null {
  try {
    const parsed: unknown = JSON.parse(rawData);

    if (!isRecord(parsed)) {
      return null;
    }

    return parsed as StreamEventData;
  } catch {
    return null;
  }
}

function normalizeSource(source: unknown, index: number): ChatSource {
  const data = isRecord(source) ? (source as RawSourceInfo) : {};

  const fileName =
    data.fileName ?? data.filename ?? data.file_name ?? `Źródło ${index + 1}`;

  const sourcePath = data.sourcePath ?? data.source_path;
  const excerpt = data.excerpt ?? data.quote ?? data.text ?? data.content;
  const chunkId = data.chunkId ?? data.chunk_id;
  const documentId =
    data.documentId ?? data.document_id ?? sourcePath ?? fileName ?? `source_${index}`;

  return {
    documentId: String(documentId),
    fileName: String(fileName),
    score: typeof data.score === 'number' ? data.score : undefined,
    excerpt: typeof excerpt === 'string' ? excerpt : undefined,
    sourcePath: typeof sourcePath === 'string' ? sourcePath : undefined,
    page: typeof data.page === 'number' ? data.page : undefined,
    chunkId: typeof chunkId === 'string' ? chunkId : undefined,
  };
}

function normalizeSources(sources?: unknown[]): ChatSource[] {
  if (!Array.isArray(sources)) return [];

  return sources.map((source, index) => normalizeSource(source, index));
}

function shouldUseMockAppPayload() {
  if (RAG_STREAM_PROTOCOL === 'mock-app') return true;
  if (RAG_STREAM_PROTOCOL === 'native') return false;

  return RAG_STREAM_PATH.includes('/mock/chat/stream');
}

function buildStreamPayload(
  payload: SendMessagePayload,
  historyTurns: BackendHistoryMessage[]
) {
  if (shouldUseMockAppPayload()) {
    return {
      query: payload.message,
      history: historyTurns.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };
  }

  return {
    message: payload.message,
    documentIds: payload.documentIds,
    history: historyTurns,
  };
}

/* =================================================================
   CHATS — wyłącznie IndexedDB
   ================================================================= */

export async function getChats(): Promise<ChatSession[]> {
  return history.listChats();
}

export async function createChat(): Promise<ChatSession> {
  return history.createChat('Nowa rozmowa');
}

export async function updateChatTitle(
  chatId: string,
  payload: UpdateChatPayload
): Promise<ChatSession> {
  return history.renameChat(chatId, payload.title);
}

export async function setChatPinned(
  chatId: string,
  pinned: boolean
): Promise<ChatSession> {
  return history.setChatPinned(chatId, pinned);
}

export async function deleteChat(chatId: string): Promise<void> {
  return history.deleteChat(chatId);
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  return history.listMessages(chatId);
}

/* =================================================================
   DOCUMENTS / FOLDERS — pozostają na backendzie (lub w mocku)
   ================================================================= */

export function getDocuments(): Promise<DocumentItem[]> {
  if (USE_MOCK_API) return mockChatApi.getDocuments();

  return request<GetDocumentsResponse>('/api/documents').then((data) => data.items);
}

export function getDocument(documentId: string): Promise<DocumentDetails> {
  if (USE_MOCK_API) return mockChatApi.getDocument(documentId);

  return request<DocumentDetails>(`/api/documents/${documentId}`);
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  if (USE_MOCK_API) return mockChatApi.uploadDocument(file);

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/documents`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.json() as Promise<DocumentItem>;
}

export function deleteDocument(documentId: string): Promise<void> {
  if (USE_MOCK_API) return mockChatApi.deleteDocument(documentId);

  return request<void>(`/api/documents/${documentId}`, { method: 'DELETE' });
}

export function getDocumentFolders(): Promise<DocumentFolder[]> {
  if (USE_MOCK_API) return mockChatApi.getDocumentFolders();

  return request<GetDocumentFoldersResponse>('/api/document-folders').then(
    (data) => data.items
  );
}

export function createDocumentFolder(
  payload: CreateDocumentFolderPayload
): Promise<DocumentFolder> {
  if (USE_MOCK_API) return mockChatApi.createDocumentFolder(payload);

  return request<DocumentFolder>('/api/document-folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDocumentFolder(
  folderId: string,
  payload: UpdateDocumentFolderPayload
): Promise<DocumentFolder> {
  if (USE_MOCK_API) return mockChatApi.updateDocumentFolder(folderId, payload);

  return request<DocumentFolder>(`/api/document-folders/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDocumentFolder(folderId: string): Promise<void> {
  if (USE_MOCK_API) return mockChatApi.deleteDocumentFolder(folderId);

  return request<void>(`/api/document-folders/${folderId}`, { method: 'DELETE' });
}

export function moveDocument(
  documentId: string,
  payload: MoveDocumentPayload
): Promise<DocumentItem> {
  if (USE_MOCK_API) return mockChatApi.moveDocument(documentId, payload);

  return request<DocumentItem>(`/api/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/* =================================================================
   STREAMING — backend RAG (bezstanowy)
   ================================================================= */

export type StreamHandlers = {
  onDelta: (content: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onDone: (data: { messageId?: string; createdAt?: string }) => void;
  onError: (message: string) => void;
};

export async function sendChatMessageStream(
  chatId: string,
  payload: SendMessagePayload,
  handlers: StreamHandlers,
  signal?: AbortSignal,
  historyTurns?: BackendHistoryMessage[]
): Promise<void> {
  /* Lokalne demo w przeglądarce zostaje dostępne, ale zewnętrzny FastAPI mock
     ma pierwszeństwo, jeśli ustawisz VITE_RAG_STREAM_PATH=/mock/chat/stream. */
  if ((USE_MOCK_API || USE_MOCK_STREAM) && !import.meta.env.VITE_RAG_STREAM_PATH) {
    return mockChatApi.sendChatMessageStream(chatId, payload, handlers, signal);
  }

  const trimmedHistory = (historyTurns ?? []).slice(-HISTORY_WINDOW_TURNS * 2);
  const streamPayload = buildStreamPayload(payload, trimmedHistory);

  const response = await fetch(`${API_URL}${RAG_STREAM_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(streamPayload),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(await getApiErrorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let didEmitDone = false;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const rawEvents = buffer.split('\n\n');
    buffer = rawEvents.pop() ?? '';

    for (const rawEvent of rawEvents) {
      const lines = rawEvent.split('\n');

      const explicitEventName = lines
        .find((line) => line.startsWith('event:'))
        ?.replace('event:', '')
        .trim();

      const rawData = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.replace('data:', '').trim())
        .join('\n');

      if (!rawData) continue;

      const data = parseStreamEventData(rawData);
      if (!data) continue;

      const eventName = explicitEventName ?? data.type;

      if (eventName === 'message.delta' || eventName === 'answer') {
        handlers.onDelta(data.content ?? '');
      }

      if (eventName === 'message.sources' || eventName === 'sources') {
        handlers.onSources(normalizeSources(data.sources));
      }

      if (eventName === 'message.done' || eventName === 'done') {
        didEmitDone = true;
        handlers.onDone({
          messageId: data.messageId,
          createdAt: data.createdAt ?? new Date().toISOString(),
        });
      }

      if (eventName === 'message.error' || eventName === 'error') {
        handlers.onError(
          data.message ??
            data.error ??
            data.content ??
            'Wystąpił błąd podczas generowania odpowiedzi.'
        );
      }
    }
  }

  if (!didEmitDone) {
    handlers.onDone({ createdAt: new Date().toISOString() });
  }
}
