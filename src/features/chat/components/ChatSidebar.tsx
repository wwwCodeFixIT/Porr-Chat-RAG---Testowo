import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import type { ChatSession } from '../types';
import { Icon } from '../../ui/icons/Icon';
import { filterChats, groupChats } from '../utils/groupChats';

import './ChatSidebar.css';

type ChatSidebarProps = {
  chats: ChatSession[];
  activeChatId: string | null;
  isLoading: boolean;
  isCreatingChat: boolean;
  isInteractionLocked: boolean;
  chatActionId: string | null;
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => Promise<void> | void;
  onDeleteChat: (chatId: string) => Promise<void> | void;
  onTogglePinChat?: (chatId: string) => Promise<void> | void;
  onExportChat?: (chatId: string) => Promise<void> | void;
};

export function ChatSidebar({
  chats,
  activeChatId,
  isLoading,
  isCreatingChat,
  isInteractionLocked,
  chatActionId,
  onCreateChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onTogglePinChat,
  onExportChat,
}: ChatSidebarProps) {
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const filtered = filterChats(chats, searchQuery);
    return groupChats(filtered);
  }, [chats, searchQuery]);

  const totalFiltered = useMemo(
    () => grouped.reduce((sum, g) => sum + g.chats.length, 0),
    [grouped]
  );

  function startEditing(chat: ChatSession) {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
    setOpenActionsId(null);
  }

  function cancelEditing() {
    setEditingChatId(null);
    setEditingTitle('');
  }

  async function handleRenameSubmit(
    event: FormEvent<HTMLFormElement>,
    chatId: string
  ) {
    event.preventDefault();
    const normalized = editingTitle.trim();
    if (!normalized) return;
    await onRenameChat(chatId, normalized);
    setEditingChatId(null);
    setEditingTitle('');
  }

  return (
    <aside className="chat-sidebar" aria-label="Historia rozmów">
      <button
        className="chat-sidebar__new-chat"
        type="button"
        disabled={isCreatingChat || isInteractionLocked}
        onClick={onCreateChat}
      >
        {isCreatingChat ? (
          'Tworzenie...'
        ) : (
          <>
            <Icon name="plus" size={17} />
            <span>Nowy chat</span>
            <span className="chat-sidebar__kbd" aria-hidden="true">
              <kbd>Ctrl</kbd>+<kbd>K</kbd>
            </span>
          </>
        )}
      </button>

      <div className="chat-sidebar__search">
        <Icon name="search" size={16} />
        <input
          ref={searchRef}
          type="search"
          className="chat-sidebar__search-input"
          placeholder="Szukaj rozmów…"
          aria-label="Szukaj rozmów"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {searchQuery ? (
          <button
            type="button"
            className="chat-sidebar__search-clear"
            aria-label="Wyczyść wyszukiwanie"
            onClick={() => {
              setSearchQuery('');
              searchRef.current?.focus();
            }}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className="chat-sidebar__skeleton"
          aria-label="Ładowanie rozmów"
          aria-busy="true"
        >
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {!isLoading && chats.length === 0 ? (
        <p className="chat-sidebar__state">
          Brak zapisanych rozmów. Rozpocznij nową, klikając „Nowy chat”.
        </p>
      ) : null}

      {!isLoading && chats.length > 0 && totalFiltered === 0 ? (
        <p className="chat-sidebar__state">
          Brak rozmów pasujących do „{searchQuery}”.
        </p>
      ) : null}

      {isInteractionLocked ? (
        <p className="chat-sidebar__notice">
          Trwa generowanie odpowiedzi — użyj „Stop”, by przerwać.
        </p>
      ) : null}

      <nav className="chat-sidebar__nav" aria-label="Lista rozmów">
        {grouped.map((group) => (
          <div key={group.key} className="chat-sidebar__group">
            <p className="chat-sidebar__group-label">
              {group.label}
              <span aria-hidden="true">{group.chats.length}</span>
            </p>

            {group.chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isEditing = chat.id === editingChatId;
              const isActionInProgress = chatActionId === chat.id;
              const isActionsOpen = openActionsId === chat.id;
              const isPinned = Boolean(chat.pinned);

              return (
                <div
                  key={chat.id}
                  className={
                    isActive
                      ? 'chat-sidebar__item chat-sidebar__item--active'
                      : 'chat-sidebar__item'
                  }
                  data-pinned={isPinned ? 'true' : undefined}
                >
                  {isEditing ? (
                    <form
                      className="chat-sidebar__edit"
                      onSubmit={(event) => handleRenameSubmit(event, chat.id)}
                    >
                      <label className="sr-only" htmlFor={`chat-title-${chat.id}`}>
                        Nazwa rozmowy
                      </label>
                      <input
                        id={`chat-title-${chat.id}`}
                        className="chat-sidebar__edit-input"
                        value={editingTitle}
                        disabled={isActionInProgress}
                        autoFocus
                        onChange={(event) => setEditingTitle(event.target.value)}
                      />
                      <div className="chat-sidebar__edit-actions">
                        <button
                          className="chat-sidebar__small-btn"
                          type="submit"
                          disabled={!editingTitle.trim() || isActionInProgress}
                        >
                          Zapisz
                        </button>
                        <button
                          className="chat-sidebar__small-btn chat-sidebar__small-btn--ghost"
                          type="button"
                          disabled={isActionInProgress}
                          onClick={cancelEditing}
                        >
                          Anuluj
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isInteractionLocked}
                        className="chat-sidebar__item-main"
                        onClick={() => onSelectChat(chat.id)}
                      >
                        {isPinned ? (
                          <span
                            className="chat-sidebar__pin"
                            aria-label="Przypięta rozmowa"
                            title="Przypięta"
                          >
                            ★
                          </span>
                        ) : null}

                        <span className="chat-sidebar__item-title">
                          {chat.title}
                        </span>

                        <span className="chat-sidebar__item-date">
                          {formatChatDate(chat.updatedAt)}
                        </span>
                      </button>

                      <div className="chat-sidebar__actions">
                        <button
                          className="chat-sidebar__actions-toggle"
                          type="button"
                          aria-label={`Akcje dla rozmowy: ${chat.title}`}
                          aria-expanded={isActionsOpen}
                          disabled={isInteractionLocked || isActionInProgress}
                          onClick={() =>
                            setOpenActionsId(isActionsOpen ? null : chat.id)
                          }
                        >
                          <Icon name="more" size={18} />
                        </button>

                        {isActionsOpen ? (
                          <div
                            className="chat-sidebar__menu"
                            role="menu"
                            onMouseLeave={() => setOpenActionsId(null)}
                          >
                            {onTogglePinChat ? (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  onTogglePinChat(chat.id);
                                }}
                              >
                                {isPinned ? 'Odepnij' : 'Przypnij'}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => startEditing(chat)}
                            >
                              Zmień nazwę
                            </button>

                            {onExportChat ? (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionsId(null);
                                  onExportChat(chat.id);
                                }}
                              >
                                Eksportuj (.md)
                              </button>
                            ) : null}

                            <button
                              type="button"
                              role="menuitem"
                              className="chat-sidebar__menu-danger"
                              onClick={() => {
                                setOpenActionsId(null);
                                onDeleteChat(chat.id);
                              }}
                            >
                              Usuń
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function formatChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dayDiff = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / 86400000
  );

  if (dayDiff === 0)
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  if (dayDiff === 1) return 'wczoraj';
  if (dayDiff < 7)
    return date.toLocaleDateString('pl-PL', { weekday: 'long' });
  return date.toLocaleDateString('pl-PL');
}
