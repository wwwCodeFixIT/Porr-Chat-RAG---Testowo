import { useCallback, useEffect, useMemo, useState } from 'react';

export type AppDensity = 'comfortable' | 'compact';
export type AppVisuals = 'rich' | 'clean';
export type AppContrast = 'standard' | 'high';

export type AppSettings = {
  density: AppDensity;
  visuals: AppVisuals;
  contrast: AppContrast;
  showKeyboardHints: boolean;
};

const STORAGE_KEY = 'korpus:app-settings:v2';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  density: 'comfortable',
  visuals: 'rich',
  contrast: 'standard',
  showKeyboardHints: true,
};

function isAppDensity(value: unknown): value is AppDensity {
  return value === 'comfortable' || value === 'compact';
}

function isAppVisuals(value: unknown): value is AppVisuals {
  return value === 'rich' || value === 'clean';
}

function isAppContrast(value: unknown): value is AppContrast {
  return value === 'standard' || value === 'high';
}

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return DEFAULT_APP_SETTINGS;

  const candidate = value as Partial<AppSettings>;

  return {
    density: isAppDensity(candidate.density)
      ? candidate.density
      : DEFAULT_APP_SETTINGS.density,
    visuals: isAppVisuals(candidate.visuals)
      ? candidate.visuals
      : DEFAULT_APP_SETTINGS.visuals,
    contrast: isAppContrast(candidate.contrast)
      ? candidate.contrast
      : DEFAULT_APP_SETTINGS.contrast,
    showKeyboardHints:
      typeof candidate.showKeyboardHints === 'boolean'
        ? candidate.showKeyboardHints
        : DEFAULT_APP_SETTINGS.showKeyboardHints,
  };
}

function applyAppSettings(settings: AppSettings) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.density = settings.density;
  document.documentElement.dataset.visuals = settings.visuals;
  document.documentElement.dataset.contrast = settings.contrast;
  document.documentElement.dataset.keyboardHints = settings.showKeyboardHints
    ? 'visible'
    : 'hidden';
}

function readSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function persistSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Local UI preferences are non-critical.
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  useEffect(() => {
    applyAppSettings(settings);
    persistSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings]
  );

  return value;
}
