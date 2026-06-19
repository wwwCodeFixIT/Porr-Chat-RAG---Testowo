import type { DocumentItem, DocumentScope } from '../types';

import './ChatDocumentsPanel.css';

type ChatDocumentsPanelProps = {
  isOpen: boolean;
  documents: DocumentItem[];
  selectedDocumentIds: string[];
  documentScope: DocumentScope;
  isLoading: boolean;
  isDisabled: boolean;
  onClose: () => void;
  onChangeScope: (scope: DocumentScope) => void;
  onToggleDocument: (documentId: string) => void;
  onRefresh: () => void;
};

function formatFileSize(size?: number) {
  if (!size) return '';

  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.round(size / 1024)} KB`;
}

function getStatusLabel(status: DocumentItem['status']) {
  if (status === 'ready') return 'Gotowy';
  if (status === 'processing') return 'Indeksowanie';
  return 'Błąd';
}

export function ChatDocumentsPanel({
  isOpen,
  documents,
  selectedDocumentIds,
  documentScope,
  isLoading,
  isDisabled,
  onClose,
  onChangeScope,
  onToggleDocument,
  onRefresh,
}: ChatDocumentsPanelProps) {
  if (!isOpen) return null;

  const readyDocuments = documents.filter(
    (documentItem) => documentItem.status === 'ready'
  );

  return (
    <aside
      className="chat-documents-panel"
      aria-label="Dokumenty używane jako kontekst rozmowy"
    >
      <div className="chat-documents-panel__header">
        <div>
          <p className="chat-documents-panel__eyebrow">Kontekst RAG</p>
          <h2 className="chat-documents-panel__title">Dokumenty</h2>
        </div>

        <button
          className="chat-documents-panel__close"
          type="button"
          aria-label="Zamknij panel dokumentów"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="chat-documents-panel__section">
        <p className="chat-documents-panel__section-title">Zakres odpowiedzi</p>

        <label className="chat-documents-panel__option">
          <input
            type="radio"
            name="documentScope"
            value="all"
            checked={documentScope === 'all'}
            disabled={isDisabled}
            onChange={() => onChangeScope('all')}
          />

          <span>
            <strong>Wszystkie gotowe dokumenty</strong>
            <small>Backend sam dobierze najbardziej trafne fragmenty.</small>
          </span>
        </label>

        <label className="chat-documents-panel__option">
          <input
            type="radio"
            name="documentScope"
            value="selected"
            checked={documentScope === 'selected'}
            disabled={isDisabled}
            onChange={() => onChangeScope('selected')}
          />

          <span>
            <strong>Tylko wybrane dokumenty</strong>
            <small>Zapytanie zostanie ograniczone do zaznaczonych plików.</small>
          </span>
        </label>
      </div>

      <div className="chat-documents-panel__toolbar">
        <p>
          Wybrane:{' '}
          <strong>
            {documentScope === 'all'
              ? readyDocuments.length
              : selectedDocumentIds.length}
          </strong>
        </p>

        <button type="button" disabled={isLoading} onClick={onRefresh}>
          Odśwież
        </button>
      </div>

      {isLoading ? (
        <div className="chat-documents-panel__state">Ładowanie dokumentów...</div>
      ) : null}

      {!isLoading && documents.length === 0 ? (
        <div className="chat-documents-panel__empty">
          <h3>Brak dokumentów</h3>
          <p>Po wgraniu plików będą dostępne tutaj jako kontekst rozmowy.</p>
        </div>
      ) : null}

      {!isLoading && documents.length > 0 ? (
        <div className="chat-documents-panel__list">
          {documents.map((documentItem) => {
            const isChecked = selectedDocumentIds.includes(documentItem.id);
            const isReady = documentItem.status === 'ready';
            const isCheckboxDisabled =
              isDisabled || documentScope !== 'selected' || !isReady;

            return (
              <label
                key={documentItem.id}
                className={
                  isReady
                    ? 'chat-documents-panel__item'
                    : 'chat-documents-panel__item chat-documents-panel__item--disabled'
                }
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isCheckboxDisabled}
                  onChange={() => onToggleDocument(documentItem.id)}
                />

                <span className="chat-documents-panel__item-content">
                  <span className="chat-documents-panel__item-top">
                    <strong>{documentItem.name}</strong>

                    <em
                      className={`chat-documents-panel__status chat-documents-panel__status--${documentItem.status}`}
                    >
                      {getStatusLabel(documentItem.status)}
                    </em>
                  </span>

                  <span className="chat-documents-panel__item-meta">
                    {formatFileSize(documentItem.size)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}