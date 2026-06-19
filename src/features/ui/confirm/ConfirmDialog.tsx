import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './ConfirmDialog.css';

type ConfirmKind = 'default' | 'danger' | 'warning';

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: ConfirmKind;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const handleAnswer = useCallback(
    (value: boolean) => {
      if (!pending) return;
      pending.resolve(value);
      setPending(null);
    },
    [pending]
  );

  // ESC = cancel, Enter = confirm; focus the confirm button
  useEffect(() => {
    if (!pending) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAnswer(true);
      }
    };
    document.addEventListener('keydown', onKey);

    // przy otwarciu focus na "Potwierdź"
    const id = window.setTimeout(() => confirmBtnRef.current?.focus(), 30);

    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [pending, handleAnswer]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {pending ? (
        <div
          className="confirm-dialog__backdrop"
          role="presentation"
          onClick={() => handleAnswer(false)}
        >
          <div
            className={`confirm-dialog confirm-dialog--${pending.kind ?? 'default'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={
              pending.description ? 'confirm-dialog-desc' : undefined
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="confirm-dialog__title">
              {pending.title}
            </h2>

            {pending.description ? (
              <div id="confirm-dialog-desc" className="confirm-dialog__desc">
                {pending.description}
              </div>
            ) : null}

            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="confirm-dialog__btn confirm-dialog__btn--ghost"
                onClick={() => handleAnswer(false)}
              >
                {pending.cancelLabel ?? 'Anuluj'}
              </button>

              <button
                ref={confirmBtnRef}
                type="button"
                className={`confirm-dialog__btn confirm-dialog__btn--primary confirm-dialog__btn--${pending.kind ?? 'default'}`}
                onClick={() => handleAnswer(true)}
              >
                {pending.confirmLabel ??
                  (pending.kind === 'danger' ? 'Usuń' : 'Potwierdź')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

/**
 * Hook do wywoływania confirmu:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Usunąć rozmowę?', kind: 'danger' })) { ... }
 */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      'useConfirm musi być wywołane wewnątrz <ConfirmDialogProvider>.'
    );
  }
  return ctx;
}

/**
 * Wygodny helper do typowych przypadków danger (usuwanie).
 */
export function useDangerConfirm() {
  const confirm = useConfirm();
  return useMemo(
    () =>
      (
        title: string,
        description?: ReactNode,
        confirmLabel = 'Usuń'
      ): Promise<boolean> =>
        confirm({ title, description, confirmLabel, kind: 'danger' }),
    [confirm]
  );
}
