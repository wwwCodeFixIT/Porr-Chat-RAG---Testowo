import { useState } from 'react';
import type { RefObject } from 'react';

import type {
  ChatMessage,
  ChatSession,
  DocumentItem,
  DocumentScope,
} from '../types';
import { Icon } from '../../ui/icons/Icon';

import { ChatDocumentsPanel } from './ChatDocumentsPanel';
import { ChatInput } from './ChatInput';
import { ChatMessageList } from './ChatMessageList';
import { ChatMessagesSkeleton } from './ChatMessagesSkeleton';
import { ChatSourcesPanel } from './ChatSourcesPanel';

import './ChatMain.css';

type ChatMainProps = {
  activeChat: ChatSession | null;
  messages: ChatMessage[];
  error: string | null;
  documents: DocumentItem[];
  selectedDocumentIds: string[];
  documentScope: DocumentScope;
  isDocumentsPanelOpen: boolean;
  isLoadingMessages: boolean;
  isLoadingDocuments: boolean;
  isSendingMessage: boolean;
  isCreatingChat: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onSendMessage: (content: string) => void;
  onStopGeneration: () => void;
  onRetry: () => void;
  onToggleDocumentsPanel: () => void;
  onCloseDocumentsPanel: () => void;
  onChangeDocumentScope: (scope: DocumentScope) => void;
  onToggleDocument: (documentId: string) => void;
  onRefreshDocuments: () => void;
  onRegenerateLast?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onOpenDocumentsView?: () => void;
};

export function ChatMain({
  activeChat,
  messages,
  error,
  documents,
  selectedDocumentIds,
  documentScope,
  isDocumentsPanelOpen,
  isLoadingMessages,
  isLoadingDocuments,
  isSendingMessage,
  isCreatingChat,
  inputRef,
  onSendMessage,
  onStopGeneration,
  onRetry,
  onToggleDocumentsPanel,
  onCloseDocumentsPanel,
  onChangeDocumentScope,
  onToggleDocument,
  onRefreshDocuments,
  onRegenerateLast,
  onEditAndResend,
  onOpenDocumentsView,
}: ChatMainProps) {
  const [sourcesMessage, setSourcesMessage] = useState<ChatMessage | null>(null);

  const readyDocumentsCount = documents.filter(
    (d) => d.status === 'ready'
  ).length;

  const totalDocumentsCount = documents.length;
  const documentsButtonLabel =
    documentScope === 'all'
      ? `Dokumenty: ${readyDocumentsCount}`
      : `Wybrane: ${selectedDocumentIds.length}`;
  const contextLabel =
    documentScope === 'all'
      ? 'Zakres: wszystkie gotowe dokumenty'
      : selectedDocumentIds.length > 0
        ? `Zakres: ${selectedDocumentIds.length} wybr.`
        : 'Zakres: brak wyboru';

  return (
    <main className="chat-main">
      <div className="chat-main__toolbar">
        <div className="chat-main__heading">
          <span className="chat-main__agent-pill">
            <Icon name="sparkles" size={14} />
            Agent RAG
          </span>
          <p className="chat-main__label">Aktywny chat</p>
          <h2 className="chat-main__title">
            {activeChat ? activeChat.title : 'Nowa rozmowa'}
          </h2>
          <p className="chat-main__context">{contextLabel}</p>
        </div>

        <div className="chat-main__toolbar-actions">
          <span className="chat-main__doc-health" title="Gotowe / wszystkie dokumenty">
            <strong>{readyDocumentsCount}</strong> / {totalDocumentsCount} gotowe
          </span>

          <button
          className={
            isDocumentsPanelOpen
              ? 'chat-main__documents chat-main__documents--active'
              : 'chat-main__documents'
          }
          type="button"
          aria-expanded={isDocumentsPanelOpen}
          aria-label="Panel kontekstu dokumentów"
          onClick={onToggleDocumentsPanel}
        >
          <Icon name="documents" size={16} />
          <span>{documentsButtonLabel}</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="chat-main__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        </div>
      ) : null}

      {isLoadingMessages ? (
        <ChatMessagesSkeleton />
      ) : (
        <ChatMessageList
          messages={messages}
          isSending={isSendingMessage}
          onOpenSources={setSourcesMessage}
          onSuggestPrompt={onSendMessage}
          onRegenerateLast={onRegenerateLast}
          onEditAndResend={onEditAndResend}
          onRetryError={onRegenerateLast}
          documentCount={documents.length}
          readyDocumentCount={readyDocumentsCount}
          onOpenDocuments={onOpenDocumentsView}
        />
      )}

      <ChatInput
        disabled={isCreatingChat}
        isSending={isSendingMessage}
        isCreatingChat={isCreatingChat}
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        inputRef={inputRef}
      />

      <ChatDocumentsPanel
        isOpen={isDocumentsPanelOpen}
        documents={documents}
        selectedDocumentIds={selectedDocumentIds}
        documentScope={documentScope}
        isLoading={isLoadingDocuments}
        isDisabled={isSendingMessage}
        onClose={onCloseDocumentsPanel}
        onChangeScope={onChangeDocumentScope}
        onToggleDocument={onToggleDocument}
        onRefresh={onRefreshDocuments}
      />

      {sourcesMessage?.sources?.length ? (
        <ChatSourcesPanel
          sources={sourcesMessage.sources}
          onClose={() => setSourcesMessage(null)}
        />
      ) : null}
    </main>
  );
}
