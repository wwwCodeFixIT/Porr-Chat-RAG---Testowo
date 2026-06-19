import type { ToastItem } from './useToasts';

import './ToastViewport.css';

type ToastViewportProps = {
  toasts: ToastItem[];
  onRemoveToast: (toastId: string) => void;
};

function getToastLabel(type: ToastItem['type']) {
  if (type === 'success') return 'Sukces';
  if (type === 'error') return 'Błąd';
  if (type === 'warning') return 'Uwaga';

  return 'Info';
}

export function ToastViewport({
  toasts,
  onRemoveToast,
}: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-viewport"
      role="region"
      aria-label="Powiadomienia systemowe"
    >
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <div className="toast__marker" aria-hidden="true" />

          <div className="toast__content">
            <p className="toast__eyebrow">{getToastLabel(toast.type)}</p>
            <h2 className="toast__title">{toast.title}</h2>

            {toast.description ? (
              <p className="toast__description">{toast.description}</p>
            ) : null}
          </div>

          <button
            className="toast__close"
            type="button"
            aria-label="Zamknij powiadomienie"
            onClick={() => onRemoveToast(toast.id)}
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}