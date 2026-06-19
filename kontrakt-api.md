# Kontrakt API — Korpus (frontend) ↔ backend RAG

Ten dokument opisuje, czego frontend **faktycznie** oczekuje od backendu — spisany
na bazie kodu, który już działa na mocku (`chatApi.ts`, `mockChatApi.ts`,
`types.ts`). Nie trzeba czytać TypeScriptu, żeby z niego skorzystać.

---

## 1. Architektura — backend RAG jest bezstanowy

Najważniejsza decyzja: **backend nie przechowuje wątków rozmów ani historii**.

- Historia czatu (lista rozmów, wiadomości, tytuły) żyje **wyłącznie w
  IndexedDB w przeglądarce**. Backend o niej nic nie wie.
- Przy każdym pytaniu frontend wysyła samodzielnie **ostatnie 6 par
  pytanie/odpowiedź** jako kontekst (`history` w body).
- Backend dostaje tylko: pytanie, opcjonalną listę `documentIds` do
  przeszukania i tę krótką historię. Nie ma `conversationId`, nie trzeba
  niczego trzymać między requestami.
- Dokumenty i foldery (file manager) **są** po stronie backendu — to dane
  wspólne dla całego zespołu, nie per-użytkownik w przeglądarce.

Jeśli wolisz backend stanowy (z `chatId` po Twojej stronie), to też jest
wsparte — patrz sekcja 5.

---

## 2. Endpoint streamu — wariant podstawowy (zalecany)

```
POST {API_URL}/api/chats/messages/stream
Content-Type: application/json
Accept: text/event-stream
```

### Body

```json
{
  "message": "Jakie są wymagania przeciwpożarowe?",
  "documentIds": ["doc_1", "doc_2"],
  "history": [
    { "role": "user", "content": "Poprzednie pytanie" },
    { "role": "assistant", "content": "Poprzednia odpowiedź" }
  ]
}
```

- `documentIds` — opcjonalne. Brak albo `[]` = szukaj we wszystkich gotowych
  dokumentach.
- `history` — max 12 wpisów (6 par), już przycięte przez frontend. Możesz to
  zignorować, jeśli Twój RAG nie potrzebuje kontekstu rozmowy.

### Response — Server-Sent Events

Cztery typy eventów, w tej kolejności (sources przed tokenami, jeśli masz je
gotowe z retrievalu zanim zaczniesz generować):

```
event: message.sources
data: {"sources":[{"fileName":"specyfikacja.pdf","page":14,"score":0.88,"excerpt":"fragment...","documentId":"doc_1"}]}

event: message.delta
data: {"content":"Na "}

event: message.delta
data: {"content":"podstawie "}

event: message.delta
data: {"content":"dokumentacji..."}

event: message.done
data: {"messageId":"msg_abc123","createdAt":"2026-06-19T10:00:00Z"}
```

W razie błędu, w dowolnym momencie streamu:

```
event: message.error
data: {"message":"Opis błędu po polsku, do pokazania userowi"}
```

### Format pojedynczego źródła

Wszystkie pola oprócz `fileName` są opcjonalne — frontend ma sensowny fallback
dla każdego brakującego pola.

| Pole | Typ | Uwagi |
|---|---|---|
| `fileName` | `string` | jedyne wymagane; jeśli brak, frontend wstawi "Źródło N" |
| `documentId` | `string` | id dokumentu z file managera |
| `page` | `number` | numer strony |
| `score` | `number` | trafność, np. 0–1 |
| `excerpt` | `string` | cytowany fragment |
| `sourcePath` | `string` | ścieżka/lokalizacja w storage |
| `chunkId` | `string` | id chunka w bazie wektorowej |

Frontend rozumie też alternatywne nazwy pól (`snake_case`), jeśli Twój RAG je
zwraca naturalnie: `document_id`, `file_name`/`filename`, `source_path`,
`quote`/`text` (zamiast `excerpt`), `chunk_id`. Nie musisz nic mapować —
możesz zwrócić to, co masz, w dowolnej z tych konwencji.

### Co musi zrobić backend przy Stopie

Frontend przerywa request `AbortController`-em (request się rozłącza). Backend
powinien:
1. Wykryć rozłączenie klienta (zależnie od frameworka — w FastAPI to
   `await request.is_disconnected()` sprawdzane między tokenami).
2. Przerwać dalsze generowanie / wywołanie do LLM.
3. Nie musisz nic zapisywać po swojej stronie (frontend zapisze to, co już
   dostał, do IndexedDB) — wystarczy nie wysyłać więcej danych po rozłączeniu.

---

## 3. Endpointy dokumentów i folderów (file manager)

Te **są** stanowe — backend trzyma listę dokumentów i folderów.

```
GET    /api/documents                        → { "items": DocumentItem[] }
GET    /api/documents/{id}                   → DocumentDetails
POST   /api/documents        (multipart/form-data, pole "file")  → DocumentItem
PATCH  /api/documents/{id}   { "folderId": "..." | null }        → DocumentItem  (przeniesienie do folderu)
DELETE /api/documents/{id}

GET    /api/document-folders                 → { "items": DocumentFolder[] }
POST   /api/document-folders { "name": "..." }            → DocumentFolder
PATCH  /api/document-folders/{id} { "name": "..." }       → DocumentFolder
DELETE /api/document-folders/{id}
```

### `DocumentItem`

```json
{
  "id": "doc_1",
  "name": "specyfikacja_techniczna.pdf",
  "mimeType": "application/pdf",
  "size": 245678,
  "status": "ready",
  "folderId": "folder_1",
  "createdAt": "2026-06-19T08:00:00Z",
  "updatedAt": "2026-06-19T08:05:00Z"
}
```

`status` to jeden z: `"ready"`, `"processing"`, `"failed"` — to steruje
licznikami i kolorami w UI (Gotowe / Indeksowanie / Błędy z Image 2).

### `DocumentDetails` (rozszerza `DocumentItem`)

Dodatkowo: `pages`, `chunksCount`, `previewUrl`, `downloadUrl`,
`errorMessage` (gdy `status === "failed"`).

### `DocumentFolder`

```json
{ "id": "folder_1", "name": "Dokumentacja projektowa", "createdAt": "...", "updatedAt": "..." }
```

Wszystkie requesty idą z `credentials: 'include'` — jeśli macie auth przez
cookie sesyjne, zadziała bez dodatkowej konfiguracji frontu.

---

## 4. Błędy — format ogólny (REST, nie-stream)

```json
{ "message": "Czytelny opis błędu" }
```

albo

```json
{ "error": "Czytelny opis błędu" }
```

Frontend sprawdza obu pól, w tej kolejności. Status HTTP powinien być
adekwatny (400/404/422/500) — frontend nie czyta kodu, tylko czy
`response.ok`.

---

## 5. Wariant alternatywny — szybki mock / inny format eventów

Jeśli wolisz wystawić provizoryczny endpoint w FastAPI z innym formatem (np.
żeby szybciej dostać coś działającego przed dopracowaniem właściwego API),
frontend to też obsłuży — wystarczy zmienić `.env`, **bez zmian w kodzie
frontendu**.

### Endpoint i payload

```
POST /mock/chat/stream
Content-Type: application/json
Accept: text/event-stream
```

```json
{ "query": "treść pytania", "history": [{ "role": "user", "content": "..." }] }
```

(zauważ: `query` zamiast `message`, brak `documentIds`)

### Eventy w tym formacie — pole `type` zamiast nazwy eventu

```
data: {"type": "sources", "sources": [{"score": 0.95, "filename": "plik.pdf", "source_path": "/path", "quote": "fragment"}]}
data: {"type": "answer", "content": "token odpowiedzi"}
data: {"type": "done"}
data: {"type": "error", "content": "opis błędu"}
```

### Konfiguracja `.env` frontendu dla tego wariantu

```env
VITE_API_URL=http://localhost:8080
VITE_USE_MOCK_API=true
VITE_USE_MOCK_STREAM=false
VITE_RAG_STREAM_PATH=/mock/chat/stream
VITE_RAG_STREAM_PROTOCOL=mock-app
```

`VITE_USE_MOCK_API=true` zostawia dokumenty/foldery w localStorage frontendu
(czyli file manager nie musi jeszcze istnieć po Twojej stronie), a tylko
stream odpowiedzi idzie do Twojego FastAPI.

**Uwaga CORS:** jeśli Twój mock działa na innym porcie niż Vite (domyślnie
`5173`), musisz dodać CORS dla adresu frontendu.

---

## 6. Której wersji użyć?

- **Masz już gotowy, docelowy endpoint** → wariant z sekcji 2 (`/api/chats/messages/stream`,
  `message.delta/sources/done/error`). To jest target.
- **Chcesz szybko zweryfikować, że cokolwiek się łączy, zanim dopracujesz
  format** → wariant z sekcji 5 (`/mock/chat/stream`, `type: answer/sources/done`).
  Zmiana między nimi to tylko `.env` po stronie frontu, zero przepisywania.

Obie wersje obsługują się przez ten sam kod — `chatApi.ts` rozpoznaje, którego
formatu używasz, na podstawie `VITE_RAG_STREAM_PROTOCOL` (albo automatycznie,
jeśli ścieżka zawiera `/mock/chat/stream`).

---

## 7. Czego NIE musisz robić

- Nie musisz zarządzać `conversationId` / sesją rozmowy — to żyje w
  IndexedDB frontu.
- Nie musisz zapisywać wiadomości użytkownika ani odpowiedzi asystenta po
  swojej stronie (chyba że chcesz, do własnych logów/analityki — frontend
  tego nie wymaga).
- Nie musisz generować tytułu rozmowy — frontend robi to lokalnie z treści
  pierwszego pytania.
