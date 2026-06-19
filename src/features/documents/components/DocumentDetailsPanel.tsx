import type { DocumentDetails, DocumentStatus } from '../../chat/types';

import './DocumentDetailsPanel.css';

type DocumentDetailsPanelProps = {
  documentDetails: DocumentDetails | null;
  isLoading: boolean;
  onClose: () => void;
};

function formatFileSize(size?: number) {
  if (!size) return '—';

  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.round(size / 1024)} KB`;
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('pl-PL');
}

function getStatusLabel(status?: DocumentStatus) {
  if (status === 'ready') return 'Gotowy';
  if (status === 'processing') return 'Indeksowanie';
  if (status === 'failed') return 'Błąd';

  return '—';
}

export function DocumentDetailsPanel({
  documentDetails,
  isLoading,
  onClose,
}: DocumentDetailsPanelProps) {
  return (
    <aside className="document-details-panel" aria-label="Szczegóły dokumentu">
      <div className="document-details-panel__header">
        <div>
          <p className="document-details-panel__eyebrow">Podgląd</p>
          <h2 className="document-details-panel__title">Szczegóły dokumentu</h2>
        </div>

        <button
          className="document-details-panel__close"
          type="button"
          aria-label="Zamknij szczegóły dokumentu"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="document-details-panel__state">
          Ładowanie szczegółów dokumentu...
        </div>
      ) : null}

      {!isLoading && !documentDetails ? (
        <div className="document-details-panel__state">
          Nie wybrano dokumentu.
        </div>
      ) : null}

      {!isLoading && documentDetails ? (
        <div className="document-details-panel__content">
          <div className="document-details-panel__file-card">
            <span className="document-details-panel__file-mark">
              {documentDetails.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
            </span>

            <div>
              <h3>{documentDetails.name}</h3>
              <p>{documentDetails.mimeType ?? 'Nieznany typ pliku'}</p>
            </div>
          </div>

          <dl className="document-details-panel__meta">
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`document-details-panel__status document-details-panel__status--${documentDetails.status}`}
                >
                  {getStatusLabel(documentDetails.status)}
                </span>
              </dd>
            </div>

            <div>
              <dt>Rozmiar</dt>
              <dd>{formatFileSize(documentDetails.size)}</dd>
            </div>

            <div>
              <dt>Liczba stron</dt>
              <dd>{documentDetails.pages ?? '—'}</dd>
            </div>

            <div>
              <dt>Liczba chunków</dt>
              <dd>{documentDetails.chunksCount ?? '—'}</dd>
            </div>

            <div>
              <dt>Dodano</dt>
              <dd>{formatDate(documentDetails.createdAt)}</dd>
            </div>

            <div>
              <dt>Ostatnia aktualizacja</dt>
              <dd>{formatDate(documentDetails.updatedAt)}</dd>
            </div>
          </dl>

          {documentDetails.errorMessage ? (
            <div className="document-details-panel__error">
              <strong>Błąd przetwarzania</strong>
              <p>{documentDetails.errorMessage}</p>
            </div>
          ) : null}

          <div className="document-details-panel__actions">
            {documentDetails.previewUrl ? (
              <a
                href={documentDetails.previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Otwórz podgląd
              </a>
            ) : null}

            {documentDetails.downloadUrl ? (
              <a
                href={documentDetails.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                Pobierz plik
              </a>
            ) : null}

            {!documentDetails.previewUrl && !documentDetails.downloadUrl ? (
              <p>Backend nie zwrócił jeszcze linku do podglądu ani pobrania.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}