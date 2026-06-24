import { useEffect, useRef, useState } from 'react';

import type { DarkMode } from '../hooks/useDarkMode';
import { Icon } from '../../ui/icons/Icon';

import './ChatHeader.css';

type AppView = 'chat' | 'documents';

type ChatHeaderProps = {
  activeView: AppView;
  themeMode: DarkMode;
  onChangeView: (view: AppView) => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onExportAll?: () => void;
  onClearHistory?: () => void;
};

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const USE_MOCK_STREAM = import.meta.env.VITE_USE_MOCK_STREAM === 'true';
const RAG_STREAM_PATH = import.meta.env.VITE_RAG_STREAM_PATH ?? '';
const RAG_STREAM_PROTOCOL = import.meta.env.VITE_RAG_STREAM_PROTOCOL ?? 'auto';

const IS_MOCK_MODE =
  USE_MOCK_API ||
  USE_MOCK_STREAM ||
  RAG_STREAM_PROTOCOL === 'mock-app' ||
  RAG_STREAM_PATH.includes('/mock/');

function getThemeButtonLabel(mode: DarkMode) {
  if (mode === 'system') return 'Tryb systemowy';
  return mode === 'dark' ? 'Włącz tryb jasny' : 'Włącz tryb ciemny';
}

export function ChatHeader({
  activeView,
  themeMode,
  onChangeView,
  onToggleTheme,
  onOpenSettings,
  onExportAll,
  onClearHistory,
}: ChatHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isMenuOpen]);

  const themeLabel = getThemeButtonLabel(themeMode);

  return (
    <header className="chat-header">
      <div className="chat-header__brand">
        <div className="chat-header__logo" aria-hidden="true">
          K
        </div>

        <div className="chat-header__brand-copy">
          <p className="chat-header__eyebrow">PORR · Document Assistant</p>
          <h1 className="chat-header__title">Korpus</h1>
        </div>

        {IS_MOCK_MODE ? <span className="chat-header__badge">Mock</span> : null}
      </div>

      <nav className="chat-header__nav" aria-label="Główna nawigacja">
        <button
          type="button"
          className={
            activeView === 'chat'
              ? 'chat-header__nav-item chat-header__nav-item--active'
              : 'chat-header__nav-item'
          }
          onClick={() => onChangeView('chat')}
        >
          <Icon name="chat" size={16} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          className={
            activeView === 'documents'
              ? 'chat-header__nav-item chat-header__nav-item--active'
              : 'chat-header__nav-item'
          }
          onClick={() => onChangeView('documents')}
        >
          <Icon name="documents" size={16} />
          <span>Dokumenty</span>
        </button>
      </nav>

      <div className="chat-header__meta">
        <button
          type="button"
          className="chat-header__icon-btn"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          <span aria-hidden="true">
            {themeMode === 'system' ? '◐' : themeMode === 'dark' ? '☀' : '☾'}
          </span>
        </button>

        <button
          type="button"
          className="chat-header__icon-btn chat-header__icon-btn--settings"
          aria-label="Otwórz ustawienia agenta"
          title="Ustawienia"
          onClick={onOpenSettings}
        >
          <Icon name="settings" size={18} />
        </button>

        <div className="chat-header__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="chat-header__icon-btn"
            aria-label="Menu dodatkowe"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            <Icon name="more" size={18} />
          </button>

          {isMenuOpen ? (
            <div className="chat-header__menu" role="menu">
              <p className="chat-header__menu-section">Agent</p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
              >
                Ustawienia interfejsu
              </button>

              <p className="chat-header__menu-section">Historia rozmów</p>
              {onExportAll ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportAll();
                  }}
                >
                  Eksportuj wszystko (.json)
                </button>
              ) : null}
              {onClearHistory ? (
                <button
                  type="button"
                  role="menuitem"
                  className="chat-header__menu-danger"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClearHistory();
                  }}
                >
                  Wyczyść historię rozmów
                </button>
              ) : null}

              <p className="chat-header__menu-section">Skróty</p>
              <div className="chat-header__shortcuts" role="note">
                <span><kbd>Ctrl</kbd> + <kbd>K</kbd> — nowy chat</span>
                <span><kbd>Ctrl</kbd> + <kbd>/</kbd> — szukaj rozmów</span>
                <span><kbd>Ctrl</kbd> + <kbd>L</kbd> — fokus na input</span>
                <span><kbd>Ctrl</kbd> + <kbd>,</kbd> — ustawienia</span>
              </div>
            </div>
          ) : null}
        </div>

        <span className="chat-header__status">Online</span>
      </div>
    </header>
  );
}
