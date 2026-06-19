import { useCallback, useEffect, useState } from 'react';

import { STORE_KV, getByKey, put } from '../storage/idb';

const KV_KEY = 'darkMode';

export type DarkMode = 'light' | 'dark' | 'system';

type StoredDarkMode = {
  key: typeof KV_KEY;
  value: DarkMode;
};

function applyTheme(mode: DarkMode) {
  if (typeof document === 'undefined') return;

  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;

  document.documentElement.dataset.theme = resolved;
}

export function useDarkMode() {
  const [mode, setMode] = useState<DarkMode>('light'); // PORR komunikuje się przez biel — jasny jest domyślny
  const [isReady, setIsReady] = useState(false);

  // load preference on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await getByKey<StoredDarkMode>(STORE_KV, KV_KEY);
        if (!mounted) return;
        if (stored?.value) {
          setMode(stored.value);
          applyTheme(stored.value);
        } else {
          applyTheme('light');
        }
      } catch {
        applyTheme('light');
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // re-apply if "system" and OS pref changes
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);

  const update = useCallback(async (next: DarkMode) => {
    setMode(next);
    applyTheme(next);
    try {
      await put<StoredDarkMode>(STORE_KV, { key: KV_KEY, value: next });
    } catch {
      // ignore — pref nie jest krytyczne
    }
  }, []);

  const toggle = useCallback(() => {
    const next: DarkMode = mode === 'dark' ? 'light' : 'dark';
    return update(next);
  }, [mode, update]);

  return { mode, isReady, setMode: update, toggle };
}
