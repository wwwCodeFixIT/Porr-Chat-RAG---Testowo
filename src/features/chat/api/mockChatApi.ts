import type {
  ChatMessage,
  ChatSession,
  ChatSource,
  CreateDocumentFolderPayload,
  DocumentDetails,
  DocumentFolder,
  DocumentItem,
  MoveDocumentPayload,
  SendMessagePayload,
  UpdateChatPayload,
  UpdateDocumentFolderPayload,
} from '../types';

type MockDb = {
  chats: ChatSession[];
  messages: Record<string, ChatMessage[]>;
  documents: DocumentItem[];
  folders: DocumentFolder[];
};

const STORAGE_KEY = 'porr-rag-chat-mock-db';

const LEGACY_DEMO_DOCUMENT_IDS = new Set(['doc_eir_001', 'doc_eir_002']);
const LEGACY_DEMO_FOLDER_IDS = new Set(['folder_mock_1', 'folder_mock_2']);
const LEGACY_DEMO_DOCUMENT_NAMES = new Set([
  'P00100045-CPK-IBI-XXXXXXXXX-XX-PC-XX0011_PL.pdf',
  'Wymagania_wymiany_informacji_EIR.pdf',
]);
const LEGACY_DEMO_FOLDER_NAMES = new Set(['Dokumentacja projektowa', 'EIR / BIM']);

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createInitialDb(): MockDb {
  return {
    chats: [],
    messages: {},
    folders: [],
    documents: [],
  };
}

function sanitizeLegacyDemoData(db: MockDb): MockDb {
  const folders = db.folders.filter(
    (folder) =>
      !LEGACY_DEMO_FOLDER_IDS.has(folder.id) &&
      !LEGACY_DEMO_FOLDER_NAMES.has(folder.name)
  );

  const documents = db.documents
    .filter(
      (documentItem) =>
        !LEGACY_DEMO_DOCUMENT_IDS.has(documentItem.id) &&
        !LEGACY_DEMO_DOCUMENT_NAMES.has(documentItem.name)
    )
    .map((documentItem) =>
      documentItem.folderId && LEGACY_DEMO_FOLDER_IDS.has(documentItem.folderId)
        ? { ...documentItem, folderId: null, updatedAt: now() }
        : documentItem
    );

  return {
    ...db,
    folders,
    documents,
  };
}

function readDb(): MockDb {
  const rawDb = window.localStorage.getItem(STORAGE_KEY);

  if (!rawDb) {
    const initialDb = createInitialDb();

    writeDb(initialDb);

    return initialDb;
  }

  try {
    const parsedDb = JSON.parse(rawDb) as MockDb;
    const sanitizedDb = sanitizeLegacyDemoData(parsedDb);

    if (JSON.stringify(parsedDb) !== JSON.stringify(sanitizedDb)) {
      writeDb(sanitizedDb);
    }

    return sanitizedDb;
  } catch {
    const initialDb = createInitialDb();

    writeDb(initialDb);

    return initialDb;
  }
}

function writeDb(db: MockDb) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function refreshProcessingDocuments(db: MockDb): MockDb {
  const timestamp = now();

  const documents = db.documents.map((documentItem) => {
    if (documentItem.status !== 'processing') {
      return documentItem;
    }

    const createdAtTime = new Date(documentItem.createdAt).getTime();
    const elapsedMs = Date.now() - createdAtTime;

    if (elapsedMs < 8000) {
      return documentItem;
    }

    return {
      ...documentItem,
      status: 'ready' as const,
      updatedAt: timestamp,
    };
  });

  return {
    ...db,
    documents,
  };
}

function buildLocalMockSources(
  documents: DocumentItem[],
  requestedDocumentIds?: string[]
): ChatSource[] {
  const readyDocuments = documents.filter(
    (documentItem) => documentItem.status === 'ready'
  );

  const scopedDocuments = requestedDocumentIds?.length
    ? readyDocuments.filter((documentItem) =>
        requestedDocumentIds.includes(documentItem.id)
      )
    : readyDocuments;

  return scopedDocuments.slice(0, 3).map((documentItem, index) => ({
    documentId: documentItem.id,
    fileName: documentItem.name,
    score: Math.max(0.58, 0.86 - index * 0.07),
    excerpt:
      'Lokalny tryb developerski nie odczytuje treści pliku. Po podłączeniu backendu RAG pojawi się tutaj rzeczywisty fragment dokumentu.',
    sourcePath: documentItem.name,
    chunkId: `local_mock_chunk_${index + 1}`,
  }));
}

function buildLocalMockAnswer(sources: ChatSource[]) {
  if (sources.length === 0) {
    return [
      'Nie widzę jeszcze żadnych gotowych dokumentów w bazie wiedzy. ',
      'Wgraj pliki w zakładce Dokumenty albo podłącz backend RAG, ',
      'a następnie zadaj pytanie ponownie. ',
      'Ten komunikat pochodzi z czystego trybu developerskiego i nie zawiera przykładowych danych testowych.',
    ].join('');
  }

  const files = sources.map((source) => source.fileName).join(', ');

  return [
    'To jest czysty tryb developerski frontendu. ',
    'Agent otrzymał pytanie i znalazł gotowe dokumenty w lokalnej liście: ',
    files,
    '. Po podłączeniu właściwego backendu RAG odpowiedź będzie generowana na podstawie realnych fragmentów dokumentów oraz zwróconych źródeł.',
  ].join('');
}

export async function getChats(): Promise<ChatSession[]> {
  await wait(120);

  const db = readDb();

  return db.chats;
}

export async function createChat(): Promise<ChatSession> {
  await wait(120);

  const db = readDb();
  const timestamp = now();

  const newChat: ChatSession = {
    id: createId('chat'),
    title: 'Nowa rozmowa',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDb({
    ...db,
    chats: [newChat, ...db.chats],
    messages: {
      ...db.messages,
      [newChat.id]: [],
    },
  });

  return newChat;
}

export async function updateChatTitle(
  chatId: string,
  payload: UpdateChatPayload
): Promise<ChatSession> {
  await wait(120);

  const db = readDb();

  const updatedChats = db.chats.map((chat) =>
    chat.id === chatId
      ? {
          ...chat,
          title: payload.title,
          updatedAt: now(),
        }
      : chat
  );

  const updatedChat = updatedChats.find((chat) => chat.id === chatId);

  if (!updatedChat) {
    throw new Error('Nie znaleziono rozmowy.');
  }

  writeDb({
    ...db,
    chats: updatedChats,
  });

  return updatedChat;
}

export async function deleteChat(chatId: string): Promise<void> {
  await wait(120);

  const db = readDb();

  const { [chatId]: removedMessages, ...remainingMessages } = db.messages;
  void removedMessages;

  writeDb({
    ...db,
    chats: db.chats.filter((chat) => chat.id !== chatId),
    messages: remainingMessages,
  });
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  await wait(120);

  const db = readDb();

  return db.messages[chatId] ?? [];
}

export async function getDocuments(): Promise<DocumentItem[]> {
  await wait(120);

  const db = refreshProcessingDocuments(readDb());

  writeDb(db);

  return db.documents;
}

export async function getDocument(documentId: string): Promise<DocumentDetails> {
  await wait(120);

  const db = refreshProcessingDocuments(readDb());
  const documentItem = db.documents.find((document) => document.id === documentId);

  writeDb(db);

  if (!documentItem) {
    throw new Error('Nie znaleziono dokumentu.');
  }

  return {
    ...documentItem,
    pages: documentItem.status === 'ready' ? undefined : 0,
    chunksCount: documentItem.status === 'ready' ? undefined : 0,
    previewUrl: undefined,
    downloadUrl: undefined,
    errorMessage:
      documentItem.status === 'failed'
        ? 'Nie udało się odczytać treści pliku.'
        : undefined,
  };
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  await wait(420);

  const db = readDb();
  const timestamp = now();

  const newDocument: DocumentItem = {
    id: createId('doc'),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    status: 'processing',
    folderId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDb({
    ...db,
    documents: [newDocument, ...db.documents],
  });

  return newDocument;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await wait(120);

  const db = readDb();

  writeDb({
    ...db,
    documents: db.documents.filter((document) => document.id !== documentId),
  });
}

export async function getDocumentFolders(): Promise<DocumentFolder[]> {
  await wait(120);

  const db = readDb();

  return db.folders;
}

export async function createDocumentFolder(
  payload: CreateDocumentFolderPayload
): Promise<DocumentFolder> {
  await wait(120);

  const db = readDb();
  const timestamp = now();

  const newFolder: DocumentFolder = {
    id: createId('folder'),
    name: payload.name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDb({
    ...db,
    folders: [...db.folders, newFolder],
  });

  return newFolder;
}

export async function updateDocumentFolder(
  folderId: string,
  payload: UpdateDocumentFolderPayload
): Promise<DocumentFolder> {
  await wait(120);

  const db = readDb();
  const timestamp = now();

  const updatedFolders = db.folders.map((folder) =>
    folder.id === folderId
      ? {
          ...folder,
          name: payload.name,
          updatedAt: timestamp,
        }
      : folder
  );

  const updatedFolder = updatedFolders.find((folder) => folder.id === folderId);

  if (!updatedFolder) {
    throw new Error('Nie znaleziono folderu.');
  }

  writeDb({
    ...db,
    folders: updatedFolders,
  });

  return updatedFolder;
}

export async function deleteDocumentFolder(folderId: string): Promise<void> {
  await wait(120);

  const db = readDb();
  const timestamp = now();

  writeDb({
    ...db,
    folders: db.folders.filter((folder) => folder.id !== folderId),
    documents: db.documents.map((documentItem) =>
      documentItem.folderId === folderId
        ? {
            ...documentItem,
            folderId: null,
            updatedAt: timestamp,
          }
        : documentItem
    ),
  });
}

export async function moveDocument(
  documentId: string,
  payload: MoveDocumentPayload
): Promise<DocumentItem> {
  await wait(120);

  const db = readDb();
  const timestamp = now();

  const updatedDocuments = db.documents.map((documentItem) =>
    documentItem.id === documentId
      ? {
          ...documentItem,
          folderId: payload.folderId,
          updatedAt: timestamp,
        }
      : documentItem
  );

  const updatedDocument = updatedDocuments.find(
    (documentItem) => documentItem.id === documentId
  );

  if (!updatedDocument) {
    throw new Error('Nie znaleziono dokumentu.');
  }

  writeDb({
    ...db,
    documents: updatedDocuments,
  });

  return updatedDocument;
}

type StreamHandlers = {
  onDelta: (content: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onDone: (data: { messageId?: string; createdAt?: string }) => void;
  onError: (message: string) => void;
};

export async function sendChatMessageStream(
  _chatId: string,
  payload: SendMessagePayload,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const db = refreshProcessingDocuments(readDb());
  writeDb(db);

  const assistantMessageId = createId('msg_assistant');
  const assistantCreatedAt = now();
  const sources = buildLocalMockSources(db.documents, payload.documentIds);
  const answer = buildLocalMockAnswer(sources);
  const chunks = answer.match(/.{1,28}(\s|$)/g) ?? [answer];

  // Rzucamy AbortError przy przerwaniu — tak samo jak robi to natywny fetch()
  // w prawdziwym chatApi.ts. Dzięki temu jeden catch(AbortError) w
  // useChatMessages.runStream obsługuje Stop identycznie w obu trybach
  // (mock i realny backend) i zapisuje to, co zdążyło się wygenerować.
  for (const chunk of chunks) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    await wait(34);

    handlers.onDelta(chunk);
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  await wait(120);

  if (sources.length > 0) {
    handlers.onSources(sources);
  }

  handlers.onDone({
    messageId: assistantMessageId,
    createdAt: assistantCreatedAt,
  });
}
