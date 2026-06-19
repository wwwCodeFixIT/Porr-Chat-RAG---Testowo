import { useCallback, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ShowToastInput = {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((toastId: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId)
    );

    const timeoutId = timeoutRefs.current.get(toastId);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutRefs.current.delete(toastId);
    }
  }, []);

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      description,
      duration = 4500,
    }: ShowToastInput) => {
      const toastId = crypto.randomUUID();

      const toast: ToastItem = {
        id: toastId,
        type,
        title,
        description,
      };

      setToasts((currentToasts) => [toast, ...currentToasts].slice(0, 5));

      if (duration > 0) {
        const timeoutId = window.setTimeout(() => {
          removeToast(toastId);
        }, duration);

        timeoutRefs.current.set(toastId, timeoutId);
      }

      return toastId;
    },
    [removeToast]
  );

  return {
    toasts,
    showToast,
    removeToast,
  };
}