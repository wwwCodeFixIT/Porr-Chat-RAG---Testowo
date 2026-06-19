import type { ChatSource } from '../types';

import './ChatSources.css';

type ChatSourcesProps = {
  sources: ChatSource[];
  onOpenSources: () => void;
};

function formatScore(score?: number) {
  if (typeof score !== 'number') {
    return null;
  }

  return score.toFixed(3);
}

export function ChatSources({ sources, onOpenSources }: ChatSourcesProps) {
  const firstSource = sources[0];

  return (
    <div className="chat-sources" aria-label="Źródła odpowiedzi">
      <div className="chat-sources__header">
        <div>
          <p className="chat-sources__title">Źródła z dokumentów</p>
          <p className="chat-sources__count">
            Fragmenty użyte przez AI: {sources.length}
          </p>
        </div>

        <button
          className="chat-sources__open"
          type="button"
          onClick={onOpenSources}
        >
          Pokaż źródła
        </button>
      </div>

      {firstSource ? (
        <button
          className="chat-sources__item"
          type="button"
          onClick={onOpenSources}
        >
          <span className="chat-sources__file">{firstSource.fileName}</span>

          {typeof firstSource.score === 'number' ? (
            <span className="chat-sources__page">
              Score: {formatScore(firstSource.score)}
            </span>
          ) : null}

          {firstSource.excerpt ? (
            <small className="chat-sources__excerpt">
              {firstSource.excerpt}
            </small>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}