# Korpus

Frontend agenta RAG do dokumentacji projektowej PORR. React + TypeScript +
Vite. Dwa widoki: czat z dokumentami (streaming odpowiedzi, źródła, historia
rozmów) i file manager (upload, foldery, status indeksowania).

## Szybki start

```bash
npm install
cp .env.example .env   # ustaw VITE_API_URL pod swój backend
npm run dev
```

Bez żadnego backendu projekt też się odpali — ustaw w `.env`:

```env
VITE_USE_MOCK_API=true
VITE_USE_MOCK_STREAM=true
```

Wtedy czat, dokumenty i foldery działają w pamięci/localStorage przeglądarki,
ze sztucznym opóźnieniem symulującym realny stream.

## Co tu jest

- **Czat** (`src/features/chat/`) — historia rozmów w IndexedDB (przeglądarka,
  nie backend), streaming odpowiedzi SSE z obsługą Stopu, panel źródeł,
  inline retry, licznik znaków.
- **Dokumenty** (`src/features/documents/`) — upload, foldery, filtrowanie po
  statusie (gotowe / indeksowanie / błąd), podgląd szczegółów dokumentu.
- **Ustawienia** (`src/features/ui/settings/`) — motyw (jasny/ciemny/system),
  gęstość layoutu, kontrast, rozmiar fontu. Marka PORR (granat `#143e6f`,
  żółć `#ffed00`) jest stała i nie podlega personalizacji.
- **Style** (`src/styles/theme.css`) — jeden plik, `@layer tokens, base,
  components, density, accessibility`. Każda zmienna ma jedną definicję na
  motyw.

## Kontrakt z backendem

Backend RAG jest **bezstanowy** — nie przechowuje historii rozmów, tylko
dokumenty/foldery. Pełny opis endpointów, formatu eventów SSE i wariantu
alternatywnego (szybki FastAPI mock) jest w `kontrakt-api.md` w tym
repozytorium (jeśli go tu nie widzisz, zapytaj osobę, która Ci go przekazała).

Skrót: `POST {VITE_API_URL}{VITE_RAG_STREAM_PATH}`, SSE z eventami
`message.delta` / `message.sources` / `message.done` / `message.error`. Pełna
specyfikacja zmiennych środowiskowych jest skomentowana w `.env.example`.

## Komendy

```bash
npm run dev      # serwer deweloperski Vite
npm run build    # tsc -b && vite build — produkcyjny bundle do dist/
npm run lint     # eslint .
npm run preview  # podgląd zbudowanej wersji produkcyjnej
```

## Stack

React 19, TypeScript, Vite, IndexedDB (natywne, bez biblioteki), CSS custom
properties (bez frameworka CSS) — bez dodatkowych zależności runtime poza
React/ReactDOM.
