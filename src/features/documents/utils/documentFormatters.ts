import type { DocumentItem } from '../../chat/types';

export function formatFileSize(size?: number) {
  if (!size) return '—';

  const sizeInMb = size / 1024 / 1024;

  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`;
  }

  return `${Math.round(size / 1024)} KB`;
}

export function formatDocumentDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('pl-PL');
}

/** Wariant z godziną — używany w panelu szczegółów, gdzie precyzja ma znaczenie. */
export function formatDocumentDateTime(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('pl-PL');
}

export function getDocumentStatusLabel(status: DocumentItem['status']) {
  if (status === 'ready') return 'Gotowy';
  if (status === 'processing') return 'Indeksowanie';
  if (status === 'failed') return 'Błąd';

  return '—';
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toUpperCase() ?? 'FILE';
}