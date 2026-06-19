import { Icon } from '../../ui/icons/Icon';

import './EmptyState.css';

type EmptyStateProps = {
  onSuggest: (prompt: string) => void;
  onOpenDocuments?: () => void;
  disabled?: boolean;
  documentCount?: number;
  readyDocumentCount?: number;
};

type Suggestion = {
  title: string;
  prompt: string;
  hint: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    title: 'Podsumuj dokumenty',
    prompt: 'Podsumuj najważniejsze informacje z dostępnej dokumentacji.',
    hint: 'Szybkie streszczenie z najważniejszymi punktami.',
  },
  {
    title: 'Wypisz wymagania',
    prompt: 'Wypisz najważniejsze wymagania, założenia i warunki wynikające z dokumentów.',
    hint: 'Lista wymagań z dokumentacji i źródeł.',
  },
  {
    title: 'Znajdź ryzyka',
    prompt: 'Przeanalizuj dokumenty i wskaż ryzyka, braki, niejasności oraz elementy wymagające decyzji.',
    hint: 'Kontrola jakości dokumentacji.',
  },
  {
    title: 'Pokaż źródła',
    prompt: 'Odpowiedz na podstawie dokumentów i pokaż użyte źródła, cytaty oraz score.',
    hint: 'Odpowiedź z cytatami i fragmentami.',
  },
];

export function EmptyState({
  onSuggest,
  onOpenDocuments,
  disabled = false,
  documentCount = 0,
  readyDocumentCount = 0,
}: EmptyStateProps) {
  const hasReadyDocuments = readyDocumentCount > 0;

  return (
    <section className="empty-state" aria-label="Sugestie startowe">
      <div className="empty-state__orb empty-state__orb--one" aria-hidden="true" />
      <div className="empty-state__orb empty-state__orb--two" aria-hidden="true" />

      <div className="empty-state__inner">
        <div className="empty-state__logo-wrap">
          <div className="empty-state__logo" aria-hidden="true">
            K
          </div>
          <span className="empty-state__pulse" aria-hidden="true" />
        </div>

        <div className="empty-state__copy">
          <p className="empty-state__eyebrow">RAG Document Assistant</p>
          <h2 className="empty-state__title">
            Zapytaj <span>Korpus</span> o swoje dokumenty
          </h2>

          <p className="empty-state__lede">
            Agent analizuje wgrane pliki, odpowiada w kontekście dokumentacji i
            pokazuje źródła, cytaty oraz score użytych fragmentów.
          </p>
        </div>

        <div className="empty-state__status-grid" aria-label="Status bazy wiedzy">
          <div className="empty-state__status-card">
            <span>Dokumenty</span>
            <strong>{documentCount}</strong>
          </div>
          <div className="empty-state__status-card empty-state__status-card--accent">
            <span>Gotowe do RAG</span>
            <strong>{readyDocumentCount}</strong>
          </div>
          <div className="empty-state__status-card">
            <span>Tryb pracy</span>
            <strong>{hasReadyDocuments ? 'Gotowy' : 'Oczekuje'}</strong>
          </div>
        </div>

        {!hasReadyDocuments ? (
          <div className="empty-state__notice" role="note">
            <Icon name="documents" size={18} />
            <div>
              <strong>Najpierw wgraj dokumenty</strong>
              <span>
                Bez gotowych plików agent odpowie tylko informacyjnie — pełny RAG
                zacznie działać po uploadzie i indeksowaniu.
              </span>
            </div>
            {onOpenDocuments ? (
              <button type="button" onClick={onOpenDocuments}>
                Przejdź do dokumentów
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="empty-state__suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              className="empty-state__card"
              disabled={disabled}
              onClick={() => onSuggest(s.prompt)}
            >
              <span className="empty-state__card-icon" aria-hidden="true">
                <Icon name="arrowRight" size={16} />
              </span>
              <span className="empty-state__card-title">{s.title}</span>
              <span className="empty-state__card-hint">{s.hint}</span>
            </button>
          ))}
        </div>

        <p className="empty-state__shortcut">
          <kbd>Ctrl</kbd> + <kbd>K</kbd> nowy chat · <kbd>Ctrl</kbd> + <kbd>/</kbd>{' '}
          historia · <kbd>Ctrl</kbd> + <kbd>,</kbd> ustawienia
        </p>
      </div>
    </section>
  );
}
