# Integracja z `mock_app.zip` FastAPI

Frontend obsługuje teraz stream z mocka FastAPI w formacie:

```txt
POST /mock/chat/stream
Content-Type: application/json
Accept: text/event-stream
```

Payload wysyłany do mocka:

```json
{
  "query": "Treść pytania użytkownika",
  "history": [
    { "role": "user", "content": "Poprzednie pytanie" },
    { "role": "assistant", "content": "Poprzednia odpowiedź" }
  ]
}
```

Frontend parsuje eventy:

```json
{ "type": "sources", "sources": [{ "score": 0.95, "filename": "plik.pdf", "source_path": "/path", "quote": "fragment" }] }
{ "type": "answer", "content": "token odpowiedzi" }
{ "type": "done" }
{ "type": "error", "content": "opis błędu" }
```

## Konfiguracja `.env` dla zewnętrznego mocka FastAPI

```env
VITE_API_URL=http://localhost:8080
VITE_USE_MOCK_API=true
VITE_USE_MOCK_STREAM=false
VITE_RAG_STREAM_PATH=/mock/chat/stream
VITE_RAG_STREAM_PROTOCOL=mock-app
```

`VITE_USE_MOCK_API=true` zostawia dokumenty/foldery w localStorage frontendu, a stream odpowiedzi idzie do FastAPI mocka.

## Uwaga CORS

Jeżeli mock FastAPI działa na innym porcie niż Vite, backend musi mieć CORS dla adresu frontendu, np. `http://localhost:5173`.
