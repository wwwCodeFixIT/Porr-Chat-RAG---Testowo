import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { ConfirmDialogProvider } from './features/ui/confirm/ConfirmDialog';

import './styles/theme.css';

// Domyślny motyw ustawiany natychmiast (przed renderem React), żeby uniknąć
// mignięcia nieostylowanej treści. useDarkMode() i tak nadpisze go preferencją
// zapisaną w IndexedDB, jeśli istnieje. PORR komunikuje się przez biel +
// granat + żółć jako akcent — jasny motyw jest tu domyślny, nie ciemny.
if (!document.documentElement.dataset.theme) {
  document.documentElement.dataset.theme = 'light';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </React.StrictMode>
);
