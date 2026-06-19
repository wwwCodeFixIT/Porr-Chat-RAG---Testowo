/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_USE_MOCK_STREAM?: string;
  readonly VITE_RAG_STREAM_PATH?: string;
  readonly VITE_RAG_STREAM_PROTOCOL?: 'auto' | 'native' | 'mock-app';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
