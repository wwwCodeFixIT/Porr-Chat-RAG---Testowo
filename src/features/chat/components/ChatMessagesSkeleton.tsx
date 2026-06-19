import { Skeleton } from '../../ui/skeleton/Skeleton';

import './ChatMessagesSkeleton.css';

export function ChatMessagesSkeleton() {
  return (
    <section
      className="chat-messages-skeleton"
      aria-label="Ładowanie wiadomości"
      aria-busy="true"
    >
      <div className="chat-messages-skeleton__inner">
        <article className="chat-messages-skeleton__message">
          <Skeleton className="chat-messages-skeleton__avatar" variant="circle" />

          <div className="chat-messages-skeleton__content">
            <Skeleton className="chat-messages-skeleton__author" variant="text" />
            <Skeleton className="chat-messages-skeleton__line" variant="text" />
            <Skeleton className="chat-messages-skeleton__line chat-messages-skeleton__line--short" variant="text" />
          </div>
        </article>

        <article className="chat-messages-skeleton__message chat-messages-skeleton__message--user">
          <Skeleton className="chat-messages-skeleton__avatar" variant="circle" />

          <div className="chat-messages-skeleton__content">
            <Skeleton className="chat-messages-skeleton__author" variant="text" />
            <Skeleton className="chat-messages-skeleton__line" variant="text" />
          </div>
        </article>

        <article className="chat-messages-skeleton__message">
          <Skeleton className="chat-messages-skeleton__avatar" variant="circle" />

          <div className="chat-messages-skeleton__content">
            <Skeleton className="chat-messages-skeleton__author" variant="text" />
            <Skeleton className="chat-messages-skeleton__line" variant="text" />
            <Skeleton className="chat-messages-skeleton__line" variant="text" />
            <Skeleton className="chat-messages-skeleton__line chat-messages-skeleton__line--medium" variant="text" />
          </div>
        </article>
      </div>
    </section>
  );
}