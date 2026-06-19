import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  DocumentDetails,
  DocumentFolder,
  DocumentFolderFilter,
  DocumentItem,
} from '../../chat/types';
import { Icon } from '../../ui/icons/Icon';

import { DocumentDetailsPanel } from './DocumentDetailsPanel';
import { DocumentsTableSkeleton } from './DocumentsTableSkeleton';
import { DocumentFileMark } from './DocumentFileMark';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import {
  formatDocumentDate,
  formatFileSize,
} from '../utils/documentFormatters';

import './DocumentsManager.css';

type DocumentStatusFilter = 'all' | 'ready' | 'processing' | 'failed';

type DocumentsManagerProps = {
  documents: DocumentItem[];
  folders: DocumentFolder[];
  activeFolderId: DocumentFolderFilter;
  selectedDocumentId: string | null;
  selectedDocumentDetails: DocumentDetails | null;
  isLoading: boolean;
  isUploading: boolean;
  isCreatingFolder: boolean;
  isLoadingDocumentDetails: boolean;
  deletingDocumentId: string | null;
  movingDocumentId: string | null;
  folderActionId: string | null;
  isBulkDocumentAction: boolean;
  onUploadDocuments: (files: File[]) => void;
  onDeleteDocument: (documentId: string) => void;
  onDeleteDocuments: (documentIds: string[]) => Promise<void>;
  onOpenDocument: (documentId: string) => void;
  onCloseDocumentDetails: () => void;
  onRefreshDocuments: () => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSelectFolder: (folderId: DocumentFolderFilter) => void;
  onMoveDocument: (documentId: string, folderId: string | null) => void;
  onMoveDocuments: (
    documentIds: string[],
    folderId: string | null
  ) => Promise<void>;
};

export function DocumentsManager({
  documents,
  folders,
  activeFolderId,
  selectedDocumentId,
  selectedDocumentDetails,
  isLoading,
  isUploading,
  isCreatingFolder,
  isLoadingDocumentDetails,
  deletingDocumentId,
  movingDocumentId,
  folderActionId,
  isBulkDocumentAction,
  onUploadDocuments,
  onDeleteDocument,
  onDeleteDocuments,
  onOpenDocument,
  onCloseDocumentDetails,
  onRefreshDocuments,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSelectFolder,
  onMoveDocument,
  onMoveDocuments,
}: DocumentsManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<DocumentStatusFilter>('all');
  const [bulkSelectedDocumentIds, setBulkSelectedDocumentIds] = useState<
    string[]
  >([]);
  const [bulkTargetFolderId, setBulkTargetFolderId] =
    useState('__unassigned__');

  const visibleDocuments = useMemo(() => {
    let filteredDocuments = documents;

    if (activeFolderId === 'unassigned') {
      filteredDocuments = filteredDocuments.filter(
        (documentItem) => !documentItem.folderId
      );
    }

    if (activeFolderId !== 'all' && activeFolderId !== 'unassigned') {
      filteredDocuments = filteredDocuments.filter(
        (documentItem) => documentItem.folderId === activeFolderId
      );
    }

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    if (normalizedSearchQuery) {
      filteredDocuments = filteredDocuments.filter((documentItem) =>
        documentItem.name.toLowerCase().includes(normalizedSearchQuery)
      );
    }

    if (statusFilter !== 'all') {
      filteredDocuments = filteredDocuments.filter(
        (documentItem) => documentItem.status === statusFilter
      );
    }

    return filteredDocuments;
  }, [activeFolderId, documents, searchQuery, statusFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || statusFilter !== 'all';

  const visibleDocumentIds = useMemo(
    () => visibleDocuments.map((documentItem) => documentItem.id),
    [visibleDocuments]
  );

  const selectedVisibleDocumentIds = bulkSelectedDocumentIds.filter(
    (documentId) => visibleDocumentIds.includes(documentId)
  );

  const areAllVisibleDocumentsSelected =
    visibleDocuments.length > 0 &&
    visibleDocuments.every((documentItem) =>
      bulkSelectedDocumentIds.includes(documentItem.id)
    );

  const selectedDocumentsCount = bulkSelectedDocumentIds.length;

  const unassignedCount = documents.filter(
    (documentItem) => !documentItem.folderId
  ).length;
  const documentStats = useMemo(
    () => ({
      total: documents.length,
      ready: documents.filter((documentItem) => documentItem.status === 'ready').length,
      processing: documents.filter(
        (documentItem) => documentItem.status === 'processing'
      ).length,
      failed: documents.filter((documentItem) => documentItem.status === 'failed').length,
    }),
    [documents]
  );


  useEffect(() => {
    setBulkSelectedDocumentIds((currentIds) =>
      currentIds.filter((documentId) =>
        documents.some((documentItem) => documentItem.id === documentId)
      )
    );
  }, [documents]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onUploadDocuments(files);
    }

    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files ?? []);

    if (files.length > 0) {
      onUploadDocuments(files);
    }
  }

  function handleCreateFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = newFolderName.trim();

    if (!normalizedName) return;

    onCreateFolder(normalizedName);
    setNewFolderName('');
  }

  function handleStartEditingFolder(folder: DocumentFolder) {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  }

  function handleCancelEditingFolder() {
    setEditingFolderId(null);
    setEditingFolderName('');
  }

  function handleRenameFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingFolderId) return;

    const normalizedName = editingFolderName.trim();

    if (!normalizedName) return;

    onRenameFolder(editingFolderId, normalizedName);
    setEditingFolderId(null);
    setEditingFolderName('');
  }

  function handleClearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
  }

  function handleToggleDocumentSelection(documentId: string) {
    setBulkSelectedDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((id) => id !== documentId)
        : [...currentIds, documentId]
    );
  }

  function handleToggleAllVisibleDocuments() {
    if (areAllVisibleDocumentsSelected) {
      setBulkSelectedDocumentIds((currentIds) =>
        currentIds.filter(
          (documentId) => !visibleDocumentIds.includes(documentId)
        )
      );

      return;
    }

    setBulkSelectedDocumentIds((currentIds) =>
      Array.from(new Set([...currentIds, ...visibleDocumentIds]))
    );
  }

  async function handleBulkDelete() {
    if (bulkSelectedDocumentIds.length === 0) return;

    await onDeleteDocuments(bulkSelectedDocumentIds);
    setBulkSelectedDocumentIds([]);
  }

  async function handleBulkMove() {
    if (bulkSelectedDocumentIds.length === 0) return;

    const targetFolderId =
      bulkTargetFolderId === '__unassigned__' ? null : bulkTargetFolderId;

    await onMoveDocuments(bulkSelectedDocumentIds, targetFolderId);
    setBulkSelectedDocumentIds([]);
  }

  return (
    <main className="documents-manager">
      <div className="documents-manager__header">
        <div>
          <p className="documents-manager__eyebrow">Filemanager</p>
          <h2 className="documents-manager__title">Dokumenty</h2>
          <p className="documents-manager__subtitle">
            Zarządzaj plikami, folderami i dokumentacją indeksowaną do bazy
            wektorowej.
          </p>
        </div>

        <button
          className="documents-manager__refresh"
          type="button"
          disabled={isLoading || isUploading}
          onClick={onRefreshDocuments}
        >
          <Icon name="refresh" size={16} />
          <span>Odśwież</span>
        </button>
      </div>

      <section className="documents-manager__stats" aria-label="Statystyki dokumentów">
        <article className="documents-manager__stat-card">
          <span>Wszystkie</span>
          <strong>{documentStats.total}</strong>
        </article>
        <article className="documents-manager__stat-card documents-manager__stat-card--ready">
          <span>Gotowe</span>
          <strong>{documentStats.ready}</strong>
        </article>
        <article className="documents-manager__stat-card documents-manager__stat-card--processing">
          <span>Indeksowanie</span>
          <strong>{documentStats.processing}</strong>
        </article>
        <article className="documents-manager__stat-card documents-manager__stat-card--failed">
          <span>Błędy</span>
          <strong>{documentStats.failed}</strong>
        </article>
      </section>

      <section
        className={
          isDragActive
            ? 'documents-manager__upload documents-manager__upload--active'
            : 'documents-manager__upload'
        }
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          className="documents-manager__file-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
          onChange={handleInputChange}
        />

        <div className="documents-manager__upload-icon" aria-hidden="true">
          <Icon name="upload" size={28} />
        </div>

        <h3>Wgraj dokumenty</h3>

        <p>
          Przeciągnij pliki tutaj albo wybierz je z dysku. Po uploadzie backend
          powinien rozpocząć indeksowanie.
        </p>

        <button
          className="documents-manager__upload-button"
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            'Wgrywanie...'
          ) : (
            <>
              <Icon name="upload" size={16} />
              <span>Wybierz pliki</span>
            </>
          )}
        </button>

        <small>Obsługiwane: PDF, DOC, DOCX, TXT, MD, CSV, XLSX</small>
      </section>

      <div className="documents-manager__content">
        <aside className="documents-manager__folders" aria-label="Foldery">
          <div className="documents-manager__folders-header">
            <h3>Foldery</h3>
            <p>Kolekcje dokumentów</p>
          </div>

          <form
            className="documents-manager__folder-form"
            onSubmit={handleCreateFolderSubmit}
          >
            <label className="sr-only" htmlFor="document-folder-name">
              Nazwa folderu
            </label>

            <input
              id="document-folder-name"
              value={newFolderName}
              disabled={isCreatingFolder}
              placeholder="Nowy folder"
              onChange={(event) => setNewFolderName(event.target.value)}
            />

            <button
              type="submit"
              disabled={!newFolderName.trim() || isCreatingFolder}
              aria-label="Utwórz folder"
            >
              {isCreatingFolder ? '...' : <Icon name="plus" size={17} />}
            </button>
          </form>

          <div className="documents-manager__folder-list">
            <button
              type="button"
              className={
                activeFolderId === 'all'
                  ? 'documents-manager__folder documents-manager__folder--active'
                  : 'documents-manager__folder'
              }
              onClick={() => onSelectFolder('all')}
            >
              <span className="documents-manager__folder-label">
                <Icon name="documents" size={16} />
                <span>Wszystkie</span>
              </span>
              <strong>{documents.length}</strong>
            </button>

            <button
              type="button"
              className={
                activeFolderId === 'unassigned'
                  ? 'documents-manager__folder documents-manager__folder--active'
                  : 'documents-manager__folder'
              }
              onClick={() => onSelectFolder('unassigned')}
            >
              <span className="documents-manager__folder-label">
                <Icon name="folder" size={16} />
                <span>Bez folderu</span>
              </span>
              <strong>{unassignedCount}</strong>
            </button>

            {folders.map((folder) => {
              const folderCount = documents.filter(
                (documentItem) => documentItem.folderId === folder.id
              ).length;
              const isFolderActive = activeFolderId === folder.id;
              const isFolderBusy = folderActionId === folder.id;
              const isEditing = editingFolderId === folder.id;

              if (isEditing) {
                return (
                  <form
                    key={folder.id}
                    className="documents-manager__folder-edit"
                    onSubmit={handleRenameFolderSubmit}
                  >
                    <input
                      value={editingFolderName}
                      disabled={isFolderBusy}
                      autoFocus
                      onChange={(event) =>
                        setEditingFolderName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          handleCancelEditingFolder();
                        }
                      }}
                    />

                    <button
                      type="submit"
                      disabled={!editingFolderName.trim() || isFolderBusy}
                      aria-label="Zapisz nazwę folderu"
                    >
                      <Icon name="check" size={15} />
                    </button>

                    <button
                      type="button"
                      disabled={isFolderBusy}
                      aria-label="Anuluj zmianę nazwy folderu"
                      onClick={handleCancelEditingFolder}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  key={folder.id}
                  className={
                    isFolderActive
                      ? 'documents-manager__folder-row documents-manager__folder-row--active'
                      : 'documents-manager__folder-row'
                  }
                >
                  <button
                    type="button"
                    className="documents-manager__folder documents-manager__folder--custom"
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <span className="documents-manager__folder-label">
                      <Icon
                        name={isFolderActive ? 'folderOpen' : 'folder'}
                        size={16}
                      />
                      <span>{folder.name}</span>
                    </span>
                    <strong>{folderCount}</strong>
                  </button>

                  <div className="documents-manager__folder-actions">
                    <button
                      type="button"
                      disabled={isFolderBusy}
                      aria-label={`Zmień nazwę folderu ${folder.name}`}
                      onClick={() => handleStartEditingFolder(folder)}
                    >
                      <Icon name="edit" size={14} />
                    </button>

                    <button
                      type="button"
                      disabled={isFolderBusy}
                      aria-label={`Usuń folder ${folder.name}`}
                      onClick={() => onDeleteFolder(folder.id)}
                    >
                      {isFolderBusy ? '…' : <Icon name="trash" size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="documents-manager__list-section">
          <div className="documents-manager__list-header">
            <div>
              <h3>Lista dokumentów</h3>
              <p>
                Widoczne pliki: {visibleDocuments.length} / {documents.length}
              </p>
            </div>

            <div className="documents-manager__filters">
              <label className="sr-only" htmlFor="documents-search">
                Szukaj dokumentu
              </label>

              <input
                id="documents-search"
                className="documents-manager__search"
                type="search"
                value={searchQuery}
                placeholder="Szukaj po nazwie pliku..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />

              <label className="sr-only" htmlFor="documents-status-filter">
                Filtr statusu
              </label>

              <select
                id="documents-status-filter"
                className="documents-manager__status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as DocumentStatusFilter)
                }
              >
                <option value="all">Wszystkie statusy</option>
                <option value="ready">Gotowe</option>
                <option value="processing">Indeksowanie</option>
                <option value="failed">Błąd</option>
              </select>

              {hasActiveFilters ? (
                <button
                  className="documents-manager__clear-filters"
                  type="button"
                  onClick={handleClearFilters}
                >
                  Wyczyść
                </button>
              ) : null}
            </div>
          </div>

          {selectedDocumentsCount > 0 ? (
            <div className="documents-manager__bulk-bar">
              <div>
                <strong>Zaznaczono: {selectedDocumentsCount}</strong>
                <span>
                  Widoczne zaznaczone: {selectedVisibleDocumentIds.length}
                </span>
              </div>

              <div className="documents-manager__bulk-actions">
                <select
                  value={bulkTargetFolderId}
                  disabled={isBulkDocumentAction}
                  onChange={(event) => setBulkTargetFolderId(event.target.value)}
                >
                  <option value="__unassigned__">Bez folderu</option>

                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={isBulkDocumentAction}
                  onClick={handleBulkMove}
                >
                  {isBulkDocumentAction ? 'Przenoszenie...' : 'Przenieś'}
                </button>

                <button
                  type="button"
                  className="documents-manager__bulk-danger"
                  disabled={isBulkDocumentAction}
                  onClick={handleBulkDelete}
                >
                  {isBulkDocumentAction ? 'Usuwanie...' : 'Usuń'}
                </button>

                <button
                  type="button"
                  disabled={isBulkDocumentAction}
                  onClick={() => setBulkSelectedDocumentIds([])}
                >
                  Wyczyść wybór
                </button>
              </div>
            </div>
          ) : null}

          {isLoading ? <DocumentsTableSkeleton /> : null}

          {!isLoading && visibleDocuments.length === 0 ? (
            <div className="documents-manager__empty">
              <h3>{hasActiveFilters ? 'Brak wyników' : 'Brak dokumentów'}</h3>

              <p>
                {hasActiveFilters
                  ? 'Zmień frazę wyszukiwania albo wyczyść filtry.'
                  : 'W tym folderze nie ma jeszcze żadnych dokumentów.'}
              </p>

              {hasActiveFilters ? (
                <button
                  className="documents-manager__empty-action"
                  type="button"
                  onClick={handleClearFilters}
                >
                  Wyczyść filtry
                </button>
              ) : null}
            </div>
          ) : null}

          {!isLoading && visibleDocuments.length > 0 ? (
            <div className="documents-manager__table-wrap">
              <table className="documents-manager__table">
                <thead>
                  <tr>
                    <th className="documents-manager__select-column">
                      <label className="documents-manager__checkbox">
                        <input
                          type="checkbox"
                          checked={areAllVisibleDocumentsSelected}
                          disabled={
                            visibleDocuments.length === 0 ||
                            isBulkDocumentAction
                          }
                          onChange={handleToggleAllVisibleDocuments}
                        />
                        <span className="sr-only">
                          Zaznacz wszystkie widoczne dokumenty
                        </span>
                      </label>
                    </th>
                    <th>Nazwa</th>
                    <th>Status</th>
                    <th>Folder</th>
                    <th>Rozmiar</th>
                    <th>Dodano</th>
                    <th>Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDocuments.map((documentItem) => {
                    const isDeleting = deletingDocumentId === documentItem.id;
                    const isMoving = movingDocumentId === documentItem.id;
                    const isSelected = selectedDocumentId === documentItem.id;

                    return (
                      <tr
                        key={documentItem.id}
                        className={
                          isSelected ? 'documents-manager__row--selected' : ''
                        }
                      >
                        <td className="documents-manager__select-column">
                          <label className="documents-manager__checkbox">
                            <input
                              type="checkbox"
                              checked={bulkSelectedDocumentIds.includes(
                                documentItem.id
                              )}
                              disabled={isBulkDocumentAction || isDeleting || isMoving}
                              onChange={() =>
                                handleToggleDocumentSelection(documentItem.id)
                              }
                            />
                            <span className="sr-only">
                              Zaznacz dokument {documentItem.name}
                            </span>
                          </label>
                        </td>

                        <td>
                          <div className="documents-manager__file">
  <DocumentFileMark fileName={documentItem.name} />

  <div>
    <strong title={documentItem.name}>
      {documentItem.name}
    </strong>
    <small>{documentItem.mimeType ?? '—'}</small>
  </div>
</div>
                        </td>

                        <td>
                          <DocumentStatusBadge status={documentItem.status} />
                        </td>

                        <td>
                          <select
                            className="documents-manager__folder-select"
                            value={documentItem.folderId ?? ''}
                            disabled={isMoving || isDeleting || isUploading}
                            onChange={(event) =>
                              onMoveDocument(
                                documentItem.id,
                                event.target.value || null
                              )
                            }
                          >
                            <option value="">Bez folderu</option>

                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>{formatFileSize(documentItem.size)}</td>
                        <td>{formatDocumentDate(documentItem.createdAt)}</td>

                        <td>
                          <div className="documents-manager__actions">
                            <button
                              type="button"
                              className="documents-manager__action"
                              disabled={isLoadingDocumentDetails}
                              onClick={() => onOpenDocument(documentItem.id)}
                            >
                              {isSelected && isLoadingDocumentDetails ? (
                                'Ładowanie...'
                              ) : (
                                <>
                                  <Icon name="sources" size={15} />
                                  <span>Podgląd</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="documents-manager__action documents-manager__action--danger"
                              disabled={isDeleting || isUploading || isMoving}
                              onClick={() => onDeleteDocument(documentItem.id)}
                            >
                              {isDeleting ? (
                                'Usuwanie...'
                              ) : (
                                <>
                                  <Icon name="trash" size={15} />
                                  <span>Usuń</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      {selectedDocumentId ? (
        <DocumentDetailsPanel
          documentDetails={selectedDocumentDetails}
          isLoading={isLoadingDocumentDetails}
          onClose={onCloseDocumentDetails}
        />
      ) : null}
    </main>
  );
}
