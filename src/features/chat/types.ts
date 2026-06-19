export type ChatRole = 'user' | 'assistant';

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  firstMessage?: string;
};

export type ChatSource = {
  documentId: string;
  fileName: string;
  page?: number;
  chunkId?: string;
  score?: number;
  excerpt?: string;
  sourcePath?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  createdAt: string;
  isStreaming?: boolean;
  error?: string;
};

export type DocumentStatus = 'ready' | 'processing' | 'failed';

export type DocumentItem = {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  status: DocumentStatus;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetails = DocumentItem & {
  pages?: number;
  chunksCount?: number;
  previewUrl?: string;
  downloadUrl?: string;
  errorMessage?: string;
};

export type DocumentFolder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentScope = 'all' | 'selected';

export type DocumentFolderFilter = 'all' | 'unassigned' | string;

export type CreateChatResponse = ChatSession;

export type GetChatsResponse = {
  items: ChatSession[];
};

export type GetMessagesResponse = {
  items: ChatMessage[];
};

export type GetDocumentsResponse = {
  items: DocumentItem[];
};

export type GetDocumentFoldersResponse = {
  items: DocumentFolder[];
};

export type SendMessagePayload = {
  message: string;
  documentIds?: string[];
};

export type UpdateChatPayload = {
  title: string;
};

export type CreateDocumentFolderPayload = {
  name: string;
};

export type UpdateDocumentFolderPayload = {
  name: string;
};

export type MoveDocumentPayload = {
  folderId: string | null;
};