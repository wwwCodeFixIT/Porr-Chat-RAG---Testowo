import type { DocumentItem } from '../../chat/types';
import { getDocumentStatusLabel } from '../utils/documentFormatters';

import './DocumentStatusBadge.css';

type DocumentStatusBadgeProps = {
  status: DocumentItem['status'];
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <span className={`document-status-badge document-status-badge--${status}`}>
      {getDocumentStatusLabel(status)}
    </span>
  );
}