import { useEffect, useRef, useState } from 'react';

import type {
  ChatMessage,
  DocumentDetails,
  DocumentFolder,
  DocumentFolderFilter,
  DocumentItem,
  DocumentScope,
} from '../types';

import {
  createDocumentFolder,
  deleteDocument,
  deleteDocumentFolder,
  getDocument,
  getDocumentFolders,
  getDocuments,
  moveDocument,
  updateDocumentFolder,
  uploadDocument,
} from '../api/chatApi';
import * as history from '../storage/chatHistory';

import { useChatSessions } from '../hooks/useChatSessions';
import { useChatMessages } from '../hooks/useChatMessages';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useDarkMode } from '../hooks/useDarkMode';

import { DocumentsManager } from '../../documents/components/DocumentsManager';
import { ToastViewport } from '../../ui/toasts/ToastViewport';
import { AppSettingsDialog } from '../../ui/settings/AppSettingsDialog';
import { useAppSettings } from '../../ui/settings/useAppSettings';
import { useToasts } from '../../ui/toasts/useToasts';
import { useConfirm } from '../../ui/confirm/ConfirmDialog';
import { DOCUMENT_POLLING_CONFIG } from '../../documents/config/documentPollingConfig';
import { validateDocumentFiles } from '../../documents/utils/validateDocumentFiles';
import { getErrorMessage } from '../../../utils/getErrorMessage';
import { exportAllAsJsonFile, exportChatAsMarkdown } from '../utils/chatExport';

import { ChatHeader } from './ChatHeader';
import { ChatMain } from './ChatMain';
import { ChatSidebar } from './ChatSidebar';

import './ChatShell.css';

type AppView = 'chat' | 'documents';

export function ChatShell() {
  const { toasts, showToast, removeToast } = useToasts();
  const confirm = useConfirm();
  const { mode, setMode, toggle: toggleTheme } = useDarkMode();
  const { settings, updateSettings, resetSettings } = useAppSettings();

  const [activeView, setActiveView] = useState<AppView>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  /* ---------------- chats + messages (IndexedDB) ---------------- */
  const sessions = useChatSessions({
    onError: (message) =>
      showToast({ type: 'error', title: 'Historia rozmów', description: message }),
    onSuccess: (title) => showToast({ type: 'success', title }),
  });

  const messagesState = useChatMessages(sessions.activeChatId, (message) =>
    showToast({ type: 'error', title: 'Generowanie', description: message })
  );

  /* ---------------- documents (server-side) ---------------- */
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentFolders, setDocumentFolders] = useState<DocumentFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<DocumentFolderFilter>('all');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentDetails, setSelectedDocumentDetails] =
    useState<DocumentDetails | null>(null);

  const [documentScope, setDocumentScope] = useState<DocumentScope>('all');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false);

  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingDocumentDetails, setIsLoadingDocumentDetails] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isBulkDocumentAction, setIsBulkDocumentAction] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [movingDocumentId, setMovingDocumentId] = useState<string | null>(null);
  const [folderActionId, setFolderActionId] = useState<string | null>(null);

  const previousDocumentsRef = useRef<DocumentItem[]>([]);
  const hasLoadedDocumentsOnceRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* ---------------- documents loading ---------------- */
  async function loadDocuments(options?: { silent?: boolean }) {
    const isSilent = options?.silent ?? false;
    try {
      if (!isSilent) setIsLoadingDocuments(true);

      const data = await getDocuments();

      if (hasLoadedDocumentsOnceRef.current) {
        const prev = previousDocumentsRef.current;
        for (const newDoc of data) {
          const prevDoc = prev.find((d) => d.id === newDoc.id);
          if (!prevDoc) continue;
          if (prevDoc.status === 'processing' && newDoc.status === 'ready') {
            showToast({
              type: 'success',
              title: 'Dokument jest gotowy',
              description: newDoc.name,
            });
          }
          if (prevDoc.status === 'processing' && newDoc.status === 'failed') {
            showToast({
              type: 'error',
              title: 'Indeksowanie nie powiodło się',
              description: newDoc.name,
            });
          }
        }
      }

      previousDocumentsRef.current = data;
      hasLoadedDocumentsOnceRef.current = true;
      setDocuments(data);

      setSelectedDocumentIds((current) =>
        current.filter((id) => data.some((d) => d.id === id))
      );
      if (
        selectedDocumentId &&
        !data.some((d) => d.id === selectedDocumentId)
      ) {
        setSelectedDocumentId(null);
        setSelectedDocumentDetails(null);
      }
    } catch (err) {
      if (!isSilent) {
        showToast({
          type: 'error',
          title: 'Nie udało się pobrać dokumentów',
          description: getErrorMessage(err, 'Brak połączenia z backendem.'),
        });
      }
    } finally {
      if (!isSilent) setIsLoadingDocuments(false);
    }
  }

  async function loadDocumentFolders() {
    try {
      const data = await getDocumentFolders();
      setDocumentFolders(data);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się pobrać folderów',
        description: getErrorMessage(err, 'Brak połączenia z backendem.'),
      });
    }
  }

  /* ---------------- chat actions ---------------- */
  async function handleCreateChat() {
    await sessions.createChat();
  }

  async function handleDeleteChat(chatId: string) {
    const chat = sessions.chats.find((c) => c.id === chatId);
    const ok = await confirm({
      title: 'Usunąć rozmowę?',
      description: chat
        ? `„${chat.title}” zostanie usunięta wraz z całą historią wiadomości. Tego nie można cofnąć.`
        : 'Tej operacji nie można cofnąć.',
      kind: 'danger',
      confirmLabel: 'Usuń',
    });
    if (!ok) return;
    await sessions.deleteChat(chatId);
  }

  async function handleClearAllHistory() {
    const ok = await confirm({
      title: 'Wyczyścić całą historię rozmów?',
      description:
        'Wszystkie chaty i wiadomości zostaną usunięte z pamięci przeglądarki (IndexedDB). Operacji nie da się cofnąć.',
      kind: 'danger',
      confirmLabel: 'Tak, wyczyść wszystko',
    });
    if (!ok) return;

    try {
      await history.clearAllChats();
      await sessions.reloadChats();
      showToast({ type: 'success', title: 'Historia została wyczyszczona.' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się wyczyścić historii',
        description: getErrorMessage(err, 'Błąd zapisu do IndexedDB.'),
      });
    }
  }

  async function handleExportChat(chatId: string) {
    try {
      await exportChatAsMarkdown(chatId);
      showToast({ type: 'success', title: 'Rozmowa wyeksportowana (.md)' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Eksport nie powiódł się',
        description: getErrorMessage(err, 'Nie udało się utworzyć pliku.'),
      });
    }
  }

  async function handleExportAll() {
    try {
      await exportAllAsJsonFile();
      showToast({ type: 'success', title: 'Wyeksportowano historię (.json)' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Eksport nie powiódł się',
        description: getErrorMessage(err, 'Nie udało się utworzyć pliku.'),
      });
    }
  }

  /* ---------------- documents actions (zostawiamy logikę z oryginału) ---------------- */
  async function handleCreateDocumentFolder(name: string) {
    const normalized = name.trim();
    if (!normalized || isCreatingFolder) return;
    try {
      setIsCreatingFolder(true);
      const created = await createDocumentFolder({ name: normalized });
      setDocumentFolders((cur) => [...cur, created]);
      setActiveFolderId(created.id);
      showToast({ type: 'success', title: 'Folder utworzony', description: normalized });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się utworzyć folderu',
        description: getErrorMessage(err, 'Błąd zapisu.'),
      });
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function handleRenameDocumentFolder(folderId: string, name: string) {
    const normalized = name.trim();
    if (!normalized || folderActionId) return;
    try {
      setFolderActionId(folderId);
      const updated = await updateDocumentFolder(folderId, { name: normalized });
      setDocumentFolders((cur) => cur.map((f) => (f.id === folderId ? updated : f)));
      showToast({ type: 'success', title: 'Nazwa folderu zmieniona', description: normalized });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się zmienić nazwy',
        description: getErrorMessage(err, 'Błąd zapisu.'),
      });
    } finally {
      setFolderActionId(null);
    }
  }

  async function handleDeleteDocumentFolder(folderId: string) {
    const folder = documentFolders.find((f) => f.id === folderId);
    const ok = await confirm({
      title: `Usunąć folder „${folder?.name ?? 'Folder'}”?`,
      description: 'Dokumenty z tego folderu zostaną przeniesione do „Bez folderu”.',
      kind: 'danger',
    });
    if (!ok || folderActionId) return;

    try {
      setFolderActionId(folderId);
      await deleteDocumentFolder(folderId);
      setDocumentFolders((cur) => cur.filter((f) => f.id !== folderId));
      setDocuments((cur) =>
        cur.map((d) =>
          d.folderId === folderId
            ? { ...d, folderId: null, updatedAt: new Date().toISOString() }
            : d
        )
      );
      if (activeFolderId === folderId) setActiveFolderId('all');
      if (selectedDocumentDetails?.folderId === folderId) {
        setSelectedDocumentDetails({
          ...selectedDocumentDetails,
          folderId: null,
          updatedAt: new Date().toISOString(),
        });
      }
      showToast({ type: 'success', title: 'Folder usunięty.' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się usunąć folderu',
        description: getErrorMessage(err, 'Błąd zapisu.'),
      });
    } finally {
      setFolderActionId(null);
    }
  }

  async function handleUploadDocuments(files: File[]) {
    if (files.length === 0 || isUploadingDocuments) return;
    const { validFiles, errors } = validateDocumentFiles(files, documents);
    if (errors.length > 0) {
      showToast({
        type: 'warning',
        title: 'Część plików nie została dodana',
        description: errors.slice(0, 3).join(' '),
        duration: 7000,
      });
    }
    if (validFiles.length === 0) return;
    try {
      setIsUploadingDocuments(true);
      const targetFolderId =
        activeFolderId !== 'all' && activeFolderId !== 'unassigned'
          ? activeFolderId
          : null;

      for (const file of validFiles) {
        const uploaded = await uploadDocument(file);
        const finalDocument = targetFolderId
          ? await moveDocument(uploaded.id, { folderId: targetFolderId })
          : uploaded;

        setDocuments((cur) => [finalDocument, ...cur]);
      }
      await loadDocuments();
      showToast({
        type: 'success',
        title: 'Dokumenty wgrane',
        description:
          validFiles.length === 1
            ? 'Plik został przekazany do indeksowania.'
            : `Liczba przesłanych plików: ${validFiles.length}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Upload nie powiódł się',
        description: getErrorMessage(err, 'Błąd przesyłania.'),
      });
    } finally {
      setIsUploadingDocuments(false);
    }
  }

  async function handleOpenDocument(documentId: string) {
    try {
      setSelectedDocumentId(documentId);
      setSelectedDocumentDetails(null);
      setIsLoadingDocumentDetails(true);
      const details = await getDocument(documentId);
      setSelectedDocumentDetails(details);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się pobrać szczegółów dokumentu',
        description: getErrorMessage(err, 'Błąd backendu.'),
      });
    } finally {
      setIsLoadingDocumentDetails(false);
    }
  }

  function handleCloseDocumentDetails() {
    setSelectedDocumentId(null);
    setSelectedDocumentDetails(null);
  }

  async function handleMoveDocument(
    documentId: string,
    folderId: string | null
  ) {
    try {
      setMovingDocumentId(documentId);
      const updated = await moveDocument(documentId, { folderId });
      setDocuments((cur) =>
        cur.map((d) => (d.id === documentId ? updated : d))
      );
      if (selectedDocumentDetails?.id === documentId) {
        setSelectedDocumentDetails((cur) =>
          cur ? { ...cur, folderId: updated.folderId, updatedAt: updated.updatedAt } : cur
        );
      }
      showToast({ type: 'success', title: 'Dokument przeniesiony' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się przenieść dokumentu',
        description: getErrorMessage(err, 'Błąd backendu.'),
      });
    } finally {
      setMovingDocumentId(null);
    }
  }

  async function handleMoveDocuments(documentIds: string[], folderId: string | null) {
    const unique = Array.from(new Set(documentIds));
    if (unique.length === 0 || isBulkDocumentAction) return;
    try {
      setIsBulkDocumentAction(true);
      const updates = await Promise.all(
        unique.map((id) => moveDocument(id, { folderId }))
      );
      const map = new Map(updates.map((u) => [u.id, u]));
      setDocuments((cur) => cur.map((d) => map.get(d.id) ?? d));

      if (selectedDocumentDetails && map.has(selectedDocumentDetails.id)) {
        const updatedSelected = map.get(selectedDocumentDetails.id);
        if (updatedSelected) {
          setSelectedDocumentDetails({
            ...selectedDocumentDetails,
            folderId: updatedSelected.folderId,
            updatedAt: updatedSelected.updatedAt,
          });
        }
      }

      showToast({
        type: 'success',
        title: 'Dokumenty przeniesione',
        description: `Liczba: ${unique.length}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się przenieść dokumentów',
        description: getErrorMessage(err, 'Błąd backendu.'),
      });
    } finally {
      setIsBulkDocumentAction(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    const doc = documents.find((d) => d.id === documentId);
    const ok = await confirm({
      title: 'Usunąć dokument?',
      description: doc
        ? `Plik „${doc.name}” zostanie usunięty z bazy wiedzy.`
        : 'Operacja jest nieodwracalna.',
      kind: 'danger',
    });
    if (!ok) return;

    try {
      setDeletingDocumentId(documentId);
      await deleteDocument(documentId);
      setDocuments((cur) => cur.filter((d) => d.id !== documentId));
      setSelectedDocumentIds((cur) => cur.filter((id) => id !== documentId));
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
        setSelectedDocumentDetails(null);
      }
      showToast({ type: 'success', title: 'Dokument usunięty.' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się usunąć dokumentu',
        description: getErrorMessage(err, 'Błąd backendu.'),
      });
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function handleDeleteDocuments(documentIds: string[]) {
    const unique = Array.from(new Set(documentIds));
    if (unique.length === 0 || isBulkDocumentAction) return;
    const ok = await confirm({
      title: 'Usunąć zaznaczone dokumenty?',
      description: `Zaznaczono: ${unique.length}. Operacji nie można cofnąć.`,
      kind: 'danger',
    });
    if (!ok) return;

    try {
      setIsBulkDocumentAction(true);
      await Promise.all(unique.map((id) => deleteDocument(id)));
      setDocuments((cur) => cur.filter((d) => !unique.includes(d.id)));
      setSelectedDocumentIds((cur) => cur.filter((id) => !unique.includes(id)));

      if (selectedDocumentId && unique.includes(selectedDocumentId)) {
        setSelectedDocumentId(null);
        setSelectedDocumentDetails(null);
      }

      showToast({
        type: 'success',
        title: 'Dokumenty usunięte',
        description: `Liczba: ${unique.length}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Nie udało się usunąć dokumentów',
        description: getErrorMessage(err, 'Błąd backendu.'),
      });
    } finally {
      setIsBulkDocumentAction(false);
    }
  }

  function handleToggleDocument(documentId: string) {
    setSelectedDocumentIds((cur) =>
      cur.includes(documentId)
        ? cur.filter((id) => id !== documentId)
        : [...cur, documentId]
    );
  }

  /* ---------------- send pipeline (uses messagesState + scope) ---------------- */
  async function handleSendMessage(content: string) {
    if (messagesState.isSending) return;

    if (documentScope === 'selected' && selectedDocumentIds.length === 0) {
      const message = 'Wybierz dokumenty albo przełącz zakres na wszystkie.';
      setIsDocumentsPanelOpen(true);
      showToast({ type: 'warning', title: 'Nie wybrano dokumentów', description: message });
      return;
    }

    // jeżeli nie ma aktywnego chatu — utwórz go i wyślij od razu do tego ID
    let targetChatId = sessions.activeChatId;
    if (!targetChatId) {
      targetChatId = await sessions.createChat();
      if (!targetChatId) return;
    }

    await messagesState.sendMessage(content, {
      chatIdOverride: targetChatId,
      documentIds:
        documentScope === 'selected' ? selectedDocumentIds : undefined,
    });

    // odśwież sortowanie sidebaru (updatedAt zmienione w IDB)
    await sessions.reloadChats();
  }

  async function handleRegenerateLast() {
    await messagesState.regenerateLast({
      documentIds:
        documentScope === 'selected' ? selectedDocumentIds : undefined,
    });
    await sessions.reloadChats();
  }

  async function handleEditAndResend(messageId: string, newContent: string) {
    await messagesState.editAndResend(messageId, newContent, {
      documentIds:
        documentScope === 'selected' ? selectedDocumentIds : undefined,
    });
    await sessions.reloadChats();
  }

  function handleRetry() {
    if (sessions.activeChatId) {
      messagesState.reload();
    } else {
      sessions.reloadChats();
    }
  }

  /* ---------------- effects ---------------- */
  useEffect(() => {
    async function bootstrap() {
      try {
        const removedLegacyChats = await history.cleanupLegacyDemoChats();
        if (removedLegacyChats > 0) {
          await sessions.reloadChats();
          showToast({
            type: 'info',
            title: 'Usunięto stare dane testowe',
            description: `Wyczyszczono rozmowy demonstracyjne: ${removedLegacyChats}.`,
          });
        }
      } catch {
        // Migracja jest best-effort i nie powinna blokować aplikacji.
      }

      loadDocuments();
      loadDocumentFolders();
    }

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;
    const id = window.setInterval(
      () => loadDocuments({ silent: true }),
      DOCUMENT_POLLING_CONFIG.intervalMs
    );
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  /* ---------------- keyboard shortcuts ---------------- */
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      label: 'Nowy chat',
      handler: (e) => {
        e.preventDefault();
        handleCreateChat();
      },
    },
    {
      key: '/',
      ctrl: true,
      label: 'Szukaj rozmów',
      handler: (e) => {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          '.chat-sidebar__search-input'
        );
        input?.focus();
        input?.select();
      },
    },
    {
      key: 'Escape',
      label: 'Zamknij panele',
      handler: () => {
        setIsDocumentsPanelOpen(false);
      },
    },
    {
      key: 'l',
      ctrl: true,
      label: 'Fokus na input',
      handler: (e) => {
        e.preventDefault();
        inputRef.current?.focus();
      },
    },
    {
      key: ',',
      ctrl: true,
      label: 'Ustawienia',
      handler: (e) => {
        e.preventDefault();
        setIsSettingsOpen(true);
      },
    },
  ]);

  const activeChat =
    sessions.chats.find((c) => c.id === sessions.activeChatId) ?? null;
  const combinedError = sessions.error ?? messagesState.error;

  return (
    <div className="chat-shell">
      <ChatHeader
        activeView={activeView}
        themeMode={mode}
        onChangeView={setActiveView}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportAll={handleExportAll}
        onClearHistory={handleClearAllHistory}
      />

      {activeView === 'chat' ? (
        <div className="chat-shell__body">
          <ChatSidebar
            chats={sessions.chats}
            activeChatId={sessions.activeChatId}
            isLoading={sessions.isLoading}
            isCreatingChat={sessions.isCreating}
            isInteractionLocked={messagesState.isSending}
            chatActionId={sessions.actionId}
            onCreateChat={handleCreateChat}
            onSelectChat={sessions.selectChat}
            onRenameChat={sessions.renameChat}
            onDeleteChat={handleDeleteChat}
            onTogglePinChat={sessions.togglePinChat}
            onExportChat={handleExportChat}
          />

          <ChatMain
            activeChat={activeChat}
            messages={messagesState.messages as ChatMessage[]}
            error={combinedError}
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            documentScope={documentScope}
            isDocumentsPanelOpen={isDocumentsPanelOpen}
            isLoadingMessages={messagesState.isLoading}
            isLoadingDocuments={isLoadingDocuments}
            isSendingMessage={messagesState.isSending}
            isCreatingChat={sessions.isCreating}
            inputRef={inputRef}
            onSendMessage={handleSendMessage}
            onStopGeneration={messagesState.stopGeneration}
            onRetry={handleRetry}
            onToggleDocumentsPanel={() =>
              setIsDocumentsPanelOpen((v) => !v)
            }
            onCloseDocumentsPanel={() => setIsDocumentsPanelOpen(false)}
            onChangeDocumentScope={setDocumentScope}
            onToggleDocument={handleToggleDocument}
            onRefreshDocuments={() => loadDocuments()}
            onRegenerateLast={handleRegenerateLast}
            onEditAndResend={handleEditAndResend}
            onOpenDocumentsView={() => setActiveView('documents')}
          />
        </div>
      ) : (
        <DocumentsManager
          documents={documents}
          folders={documentFolders}
          activeFolderId={activeFolderId}
          selectedDocumentId={selectedDocumentId}
          selectedDocumentDetails={selectedDocumentDetails}
          isLoading={isLoadingDocuments}
          isUploading={isUploadingDocuments}
          isCreatingFolder={isCreatingFolder}
          isLoadingDocumentDetails={isLoadingDocumentDetails}
          deletingDocumentId={deletingDocumentId}
          movingDocumentId={movingDocumentId}
          folderActionId={folderActionId}
          isBulkDocumentAction={isBulkDocumentAction}
          onUploadDocuments={handleUploadDocuments}
          onDeleteDocument={handleDeleteDocument}
          onDeleteDocuments={handleDeleteDocuments}
          onOpenDocument={handleOpenDocument}
          onCloseDocumentDetails={handleCloseDocumentDetails}
          onRefreshDocuments={() => {
            loadDocuments();
            loadDocumentFolders();
          }}
          onCreateFolder={handleCreateDocumentFolder}
          onRenameFolder={handleRenameDocumentFolder}
          onDeleteFolder={handleDeleteDocumentFolder}
          onSelectFolder={setActiveFolderId}
          onMoveDocument={handleMoveDocument}
          onMoveDocuments={handleMoveDocuments}
        />
      )}

      <AppSettingsDialog
        isOpen={isSettingsOpen}
        themeMode={mode}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onThemeModeChange={setMode}
        onSettingsChange={updateSettings}
        onReset={resetSettings}
      />

      <ToastViewport toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
