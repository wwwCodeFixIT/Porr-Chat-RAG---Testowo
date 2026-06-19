import { useEffect } from 'react';

export type Shortcut = {
  /** Klawisz (np. "k", "/", "Escape") — case-insensitive dla liter. */
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Nazwa kontekstowa (do debugowania). */
  label?: string;
  handler: (event: KeyboardEvent) => void;
};

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'email',
  'password',
  'tel',
  'number',
]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type?.toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

/**
 * Globalne skróty klawiszowe.
 *
 * UWAGA: Ctrl/Cmd-modyfikowane skróty (np. Ctrl+K) działają ZAWSZE,
 *        nawet wewnątrz pola tekstowego. Skróty bez modyfikatora
 *        są blokowane, gdy fokus jest w polu edycji, żeby nie pożerać
 *        zwykłego pisania.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      for (const s of shortcuts) {
        const wantsKey = s.key.length === 1 ? s.key.toLowerCase() : s.key;
        if (key !== wantsKey) continue;
        if ((s.ctrl ?? false) && !(event.ctrlKey || event.metaKey)) continue;
        if (s.meta && !event.metaKey) continue;
        if ((s.shift ?? false) !== event.shiftKey) continue;
        if ((s.alt ?? false) !== event.altKey) continue;

        // bez modyfikatora — pozwól pisać w inputach
        const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
        if (!hasModifier && isEditableTarget(event.target)) continue;

        s.handler(event);
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
