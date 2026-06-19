import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { ConfirmDialogProvider } from './features/ui/confirm/ConfirmDialog';

import './styles/theme.css';
import './styles/global.css';
import './styles/dark-overrides.css';

// Domyślny motyw ustawiany natychmiast (przed renderem React), żeby uniknąć
// mignięcia nieostylowanej treści. useDarkMode() i tak nadpisze go preferencją
// zapisaną w IndexedDB, jeśli istnieje.
if (!document.documentElement.dataset.theme) {
  document.documentElement.dataset.theme = 'dark';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </React.StrictMode>
);
