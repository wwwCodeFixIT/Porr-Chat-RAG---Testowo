import { Skeleton } from '../../ui/skeleton/Skeleton';

import './DocumentsTableSkeleton.css';

export function DocumentsTableSkeleton() {
  return (
    <div
      className="documents-table-skeleton"
      aria-label="Ładowanie dokumentów"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="documents-table-skeleton__row" key={index}>
          <Skeleton
            className="documents-table-skeleton__checkbox"
            variant="block"
          />

          <div className="documents-table-skeleton__file">
            <Skeleton
              className="documents-table-skeleton__mark"
              variant="block"
            />

            <div className="documents-table-skeleton__file-lines">
              <Skeleton
                className="documents-table-skeleton__line"
                variant="text"
              />
              <Skeleton
                className="documents-table-skeleton__line documents-table-skeleton__line--short"
                variant="text"
              />
            </div>
          </div>

          <Skeleton className="documents-table-skeleton__badge" variant="text" />
          <Skeleton
            className="documents-table-skeleton__select"
            variant="block"
          />
          <Skeleton className="documents-table-skeleton__small" variant="text" />
          <Skeleton className="documents-table-skeleton__small" variant="text" />
          <Skeleton
            className="documents-table-skeleton__actions"
            variant="block"
          />
        </div>
      ))}
    </div>
  );
}
