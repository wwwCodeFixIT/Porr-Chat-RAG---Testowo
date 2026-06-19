import { useMemo, useState } from 'react';

import type { ChatSource } from '../types';

import { Icon } from '../../ui/icons/Icon';
import './ChatSourcesPanel.css';

type ChatSourcesPanelProps = {
  sources: ChatSource[];
  onClose: () => void;
};

function formatScore(score?: number) {
  if (typeof score !== 'number') {
    return '—';
  }

  return score.toFixed(6);
}

function getScorePercent(score?: number) {
  if (typeof score !== 'number') {
    return null;
  }

  return `${Math.round(score * 100)}%`;
}

function buildSourceText(source: ChatSource, index: number) {
  return [
    `Źródło #${index + 1}`,
    `Score: ${formatScore(source.score)}`,
    `Plik: ${source.fileName}`,
    source.page ? `Strona: ${source.page}` : null,
    source.chunkId ? `Chunk: ${source.chunkId}` : null,
    source.excerpt ? `Fragment: ${source.excerpt}` : null,
    source.sourcePath ? `Źródło: ${source.sourcePath}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function ChatSourcesPanel({ sources, onClose }: ChatSourcesPanelProps) {
  const [expandedSourceIds, setExpandedSourceIds] = useState<string[]>([]);
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null);

  const sortedSources = useMemo(() => {
    return [...sources].sort((firstSource, secondSource) => {
      const firstScore = firstSource.score ?? -1;
      const secondScore = secondSource.score ?? -1;

      return secondScore - firstScore;
    });
  }, [sources]);

  function getSourceKey(source: ChatSource, index: number) {
    return `${source.documentId}-${source.chunkId ?? index}`;
  }

  function toggleExpanded(sourceKey: string) {
    setExpandedSourceIds((currentIds) =>
      currentIds.includes(sourceKey)
        ? currentIds.filter((id) => id !== sourceKey)
        : [...currentIds, sourceKey]
    );
  }

  async function handleCopySource(source: ChatSource, index: number) {
    const sourceKey = getSourceKey(source, index);
    const textToCopy = buildSourceText(source, index);

    try {
      await navigator.clipboard.writeText(textToCopy);

      setCopiedSourceId(sourceKey);

      window.setTimeout(() => {
        setCopiedSourceId((currentId) =>
          currentId === sourceKey ? null : currentId
        );
      }, 1800);
    } catch {
      setCopiedSourceId(null);
    }
  }

  return (
    <aside className="chat-sources-panel" aria-label="Źródła odpowiedzi AI">
      <div className="chat-sources-panel__header">
        <div>
          <p className="chat-sources-panel__eyebrow">RAG sources</p>
          <h2 className="chat-sources-panel__title">Źródła odpowiedzi</h2>
        </div>

        <button
  className="chat-sources-panel__close"
  type="button"
  aria-label="Zamknij źródła"
  onClick={onClose}
>
  <Icon name="close" size={18} />
</button>
      </div>

      <div className="chat-sources-panel__summary">
        <p>
          Liczba fragmentów użytych jako kontekst:{' '}
          <strong>{sortedSources.length}</strong>
        </p>

        <small>Posortowane od najwyższego score.</small>
      </div>

      <div className="chat-sources-panel__list">
        {sortedSources.map((source, index) => {
          const sourceKey = getSourceKey(source, index);
          const isExpanded = expandedSourceIds.includes(sourceKey);
          const scorePercent = getScorePercent(source.score);
          const hasLongExcerpt = Boolean(source.excerpt && source.excerpt.length > 280);

          return (
            <article key={sourceKey} className="chat-sources-panel__item">
              <div className="chat-sources-panel__item-header">
                <div>
                  <span className="chat-sources-panel__number">
                    #{index + 1}
                  </span>

                  <span className="chat-sources-panel__score">
                    Score: {formatScore(source.score)}
                  </span>
                </div>

                {scorePercent ? (
                  <span className="chat-sources-panel__score-pill">
                    {scorePercent}
                  </span>
                ) : null}
              </div>

              <dl className="chat-sources-panel__meta">
                <div>
                  <dt>Plik</dt>
                  <dd>{source.fileName}</dd>
                </div>

                {source.page ? (
                  <div>
                    <dt>Strona</dt>
                    <dd>{source.page}</dd>
                  </div>
                ) : null}

                {source.chunkId ? (
                  <div>
                    <dt>Chunk</dt>
                    <dd>{source.chunkId}</dd>
                  </div>
                ) : null}
              </dl>

              {source.excerpt ? (
                <div
                  className={
                    isExpanded
                      ? 'chat-sources-panel__excerpt chat-sources-panel__excerpt--expanded'
                      : 'chat-sources-panel__excerpt'
                  }
                >
                  <p>{source.excerpt}</p>
                </div>
              ) : (
                <div className="chat-sources-panel__excerpt chat-sources-panel__excerpt--empty">
                  <p>Backend nie zwrócił fragmentu tekstu.</p>
                </div>
              )}

              {hasLongExcerpt ? (
                <button
                  className="chat-sources-panel__text-button"
                  type="button"
                  onClick={() => toggleExpanded(sourceKey)}
                >
                  {isExpanded ? 'Zwiń fragment' : 'Pokaż cały fragment'}
                </button>
              ) : null}

              {source.sourcePath ? (
                <div className="chat-sources-panel__path">
                  <strong>Źródło:</strong>
                  <p>{source.sourcePath}</p>
                </div>
              ) : null}

              <div className="chat-sources-panel__actions">
                <button
  type="button"
  onClick={() => handleCopySource(source, index)}
>
  {copiedSourceId === sourceKey ? (
    <>
      <Icon name="check" size={15} />
      <span>Skopiowano</span>
    </>
  ) : (
    <>
      <Icon name="copy" size={15} />
      <span>Kopiuj źródło</span>
    </>
  )}
</button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}