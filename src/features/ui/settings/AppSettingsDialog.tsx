import { useEffect, useRef } from 'react';

import type { DarkMode } from '../../chat/hooks/useDarkMode';
import type {
  AppContrast,
  AppDensity,
  AppFontSize,
  AppSettings,
  AppVisuals,
} from './useAppSettings';
import { Icon } from '../icons/Icon';

import './AppSettingsDialog.css';

type AppSettingsDialogProps = {
  isOpen: boolean;
  themeMode: DarkMode;
  settings: AppSettings;
  onClose: () => void;
  onThemeModeChange: (mode: DarkMode) => void;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
};

const THEME_OPTIONS: Array<{ value: DarkMode; label: string; hint: string }> = [
  { value: 'dark', label: 'Ciemny', hint: 'Najlepszy do pracy z agentem.' },
  { value: 'light', label: 'Jasny', hint: 'Czytelny w jasnym biurze.' },
  { value: 'system', label: 'System', hint: 'Zgodnie z ustawieniami Windows.' },
];

const DENSITY_OPTIONS: Array<{ value: AppDensity; label: string; hint: string }> = [
  { value: 'comfortable', label: 'Komfortowy', hint: 'Więcej oddechu i większe odstępy.' },
  { value: 'compact', label: 'Kompaktowy', hint: 'Więcej treści na ekranie.' },
];

const VISUAL_OPTIONS: Array<{ value: AppVisuals; label: string; hint: string }> = [
  { value: 'rich', label: 'Nowoczesny', hint: 'Gradienty, glow i mocniejszy glass effect.' },
  { value: 'clean', label: 'Czysty', hint: 'Spokojniejszy interfejs do długiej pracy.' },
];

const CONTRAST_OPTIONS: Array<{ value: AppContrast; label: string; hint: string }> = [
  { value: 'standard', label: 'Standardowy', hint: 'Spokojniejszy wygląd, mniej mocne separatory.' },
  { value: 'high', label: 'Podwyższony', hint: 'Mocniejszy tekst, granice i czytelniejsze przyciski.' },
];

const FONT_SIZE_OPTIONS: Array<{ value: AppFontSize; label: string; hint: string }> = [
  { value: 'standard', label: 'Standard', hint: 'Domyślny rozmiar tekstu dla desktopu.' },
  { value: 'large', label: 'Większy tekst', hint: 'Lepsza czytelność na ekranach laptopów.' },
];

export function AppSettingsDialog({
  isOpen,
  themeMode,
  settings,
  onClose,
  onThemeModeChange,
  onSettingsChange,
  onReset,
}: AppSettingsDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    const focusId = window.setTimeout(() => closeBtnRef.current?.focus(), 40);

    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(focusId);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="app-settings__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="app-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="app-settings__header">
          <div>
            <p className="app-settings__eyebrow">Personalizacja</p>
            <h2 id="app-settings-title">Ustawienia agenta</h2>
            <p className="app-settings__lead">
              Dopasuj wygląd i zachowanie interfejsu bez resetowania historii.
            </p>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="app-settings__close"
            aria-label="Zamknij ustawienia"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="app-settings__section">
          <div className="app-settings__section-heading">
            <span className="app-settings__section-icon" aria-hidden="true">
              <Icon name="settings" size={17} />
            </span>
            <div>
              <h3>Motyw</h3>
              <p>Ustawienia zapisują się lokalnie w tej przeglądarce.</p>
            </div>
          </div>

          <div className="app-settings__options" role="radiogroup" aria-label="Motyw aplikacji">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  themeMode === option.value
                    ? 'app-settings__option app-settings__option--active'
                    : 'app-settings__option'
                }
                role="radio"
                aria-checked={themeMode === option.value}
                onClick={() => onThemeModeChange(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="app-settings__section">
          <div className="app-settings__section-heading">
            <span className="app-settings__section-icon" aria-hidden="true">
              <Icon name="documents" size={17} />
            </span>
            <div>
              <h3>Układ i gęstość</h3>
              <p>Wybierz, czy interfejs ma być bardziej przestrzenny, czy roboczy.</p>
            </div>
          </div>

          <div className="app-settings__options" role="radiogroup" aria-label="Gęstość interfejsu">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  settings.density === option.value
                    ? 'app-settings__option app-settings__option--active'
                    : 'app-settings__option'
                }
                role="radio"
                aria-checked={settings.density === option.value}
                onClick={() => onSettingsChange({ density: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="app-settings__section">
          <div className="app-settings__section-heading">
            <span className="app-settings__section-icon" aria-hidden="true">
              <Icon name="sparkles" size={17} />
            </span>
            <div>
              <h3>Wygląd</h3>
              <p>Możesz przyciszyć efekty wizualne bez utraty czytelności.</p>
            </div>
          </div>

          <div className="app-settings__options" role="radiogroup" aria-label="Styl wizualny">
            {VISUAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  settings.visuals === option.value
                    ? 'app-settings__option app-settings__option--active'
                    : 'app-settings__option'
                }
                role="radio"
                aria-checked={settings.visuals === option.value}
                onClick={() => onSettingsChange({ visuals: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="app-settings__section-heading app-settings__section-heading--nested">
            <span className="app-settings__section-icon" aria-hidden="true">
              <Icon name="check" size={17} />
            </span>
            <div>
              <h3>Kontrast i separacja</h3>
              <p>Wzmocnij czytelność, kiedy ekran jest mały albo mocno oświetlony.</p>
            </div>
          </div>

          <div className="app-settings__options" role="radiogroup" aria-label="Kontrast interfejsu">
            {CONTRAST_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  settings.contrast === option.value
                    ? 'app-settings__option app-settings__option--active'
                    : 'app-settings__option'
                }
                role="radio"
                aria-checked={settings.contrast === option.value}
                onClick={() => onSettingsChange({ contrast: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          <div className="app-settings__section-heading app-settings__section-heading--nested">
            <span className="app-settings__section-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <div>
              <h3>Czytelność tekstu</h3>
              <p>Zwiększ fonty w wiadomościach, tabelach i przyciskach.</p>
            </div>
          </div>

          <div className="app-settings__options app-settings__options--two" role="radiogroup" aria-label="Rozmiar tekstu">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  settings.fontSize === option.value
                    ? 'app-settings__option app-settings__option--active'
                    : 'app-settings__option'
                }
                role="radio"
                aria-checked={settings.fontSize === option.value}
                onClick={() => onSettingsChange({ fontSize: option.value })}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>

          <label className="app-settings__switch">
            <input
              type="checkbox"
              checked={settings.showKeyboardHints}
              onChange={(event) =>
                onSettingsChange({ showKeyboardHints: event.target.checked })
              }
            />
            <span aria-hidden="true" />
            <div>
              <strong>Pokaż skróty klawiaturowe</strong>
              <small>Widoczne wskazówki na ekranie startowym i w menu.</small>
            </div>
          </label>
        </div>

        <div className="app-settings__footer">
          <button type="button" className="app-settings__ghost" onClick={onReset}>
            Przywróć domyślne
          </button>
          <button type="button" className="app-settings__primary" onClick={onClose}>
            Gotowe
          </button>
        </div>
      </section>
    </div>
  );
}
