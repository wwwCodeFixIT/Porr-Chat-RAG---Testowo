/**
 * Minimalna, ręcznie napisana obudowa nad IndexedDB.
 * Brak zależności (`idb` itp.), pełne typowanie, promisifikacja.
 *
 * Schemat bazy:
 *   - chats       (keyPath: id)           index: byUpdatedAt
 *   - messages    (keyPath: id)           index: byChatId, byChatIdAndCreated
 *   - kv          (keyPath: key)          (preferencje, dark mode, itp.)
 *
 * Wersjonowanie: zwiększaj DB_VERSION i obsłuż migracje w `onupgradeneeded`.
 */

export const DB_NAME = 'porr-korpus';
export const DB_VERSION = 1;

export const STORE_CHATS = 'chats';
export const STORE_MESSAGES = 'messages';
export const STORE_KV = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nie jest dostępne w tej przeglądarce.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const chats = db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        chats.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
        chats.createIndex('byPinned', 'pinned', { unique: false });

        const messages = db.createObjectStore(STORE_MESSAGES, {
          keyPath: 'id',
        });
        messages.createIndex('byChatId', 'chatId', { unique: false });
        messages.createIndex('byChatIdAndCreated', ['chatId', 'createdAt'], {
          unique: false,
        });

        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }

      // future migrations: if (oldVersion < 2) { ... }
    };

    request.onsuccess = () => {
      const db = request.result;

      // jeśli baza została zaktualizowana w innej karcie — zamknij,
      // żeby user nie zobaczył błędu wersji
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(
        request.error ?? new Error('Nie udało się otworzyć bazy IndexedDB.')
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          'Baza IndexedDB jest zablokowana przez inną kartę. Zamknij inne karty Korpusu i spróbuj ponownie.'
        )
      );
    };
  });

  return dbPromise;
}

/**
 * Wykonuje funkcję w transakcji i zwraca jej wynik
 * dopiero po pomyślnym `complete` transakcji.
 *
 * Daje gwarancję, że dane zostały zapisane na dysk
 * zanim wywołujący dostanie wynik.
 */
export async function tx<TResult>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (
    stores: Record<string, IDBObjectStore>,
    transaction: IDBTransaction
  ) => Promise<TResult> | TResult
): Promise<TResult> {
  const db = await openDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];

  return new Promise<TResult>((resolve, reject) => {
    const transaction = db.transaction(names, mode);
    const stores: Record<string, IDBObjectStore> = {};

    for (const name of names) {
      stores[name] = transaction.objectStore(name);
    }

    let result: TResult;
    let userErr: unknown = null;

    Promise.resolve(fn(stores, transaction)).then(
      (value) => {
        result = value;
      },
      (error) => {
        userErr = error;
        try {
          transaction.abort();
        } catch {
          // already aborted
        }
      }
    );

    transaction.oncomplete = () => {
      if (userErr) reject(userErr);
      else resolve(result);
    };
    transaction.onerror = () => {
      reject(userErr ?? transaction.error ?? new Error('Błąd transakcji IDB'));
    };
    transaction.onabort = () => {
      reject(userErr ?? transaction.error ?? new Error('Transakcja przerwana'));
    };
  });
}

/* ------------ promisified primitives ------------ */

export function reqAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(
  storeName: string,
  options?: { index?: string; query?: IDBKeyRange | IDBValidKey | null }
): Promise<T[]> {
  return tx<T[]>(storeName, 'readonly', async (stores) => {
    const store = stores[storeName];
    const source = options?.index ? store.index(options.index) : store;
    return reqAsPromise<T[]>(source.getAll(options?.query ?? undefined));
  });
}

export async function getByKey<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  return tx<T | undefined>(storeName, 'readonly', async (stores) => {
    return reqAsPromise<T | undefined>(stores[storeName].get(key));
  });
}

export async function put<T>(storeName: string, value: T): Promise<T> {
  return tx<T>(storeName, 'readwrite', async (stores) => {
    await reqAsPromise(stores[storeName].put(value));
    return value;
  });
}

export async function bulkPut<T>(storeName: string, values: T[]): Promise<void> {
  return tx<void>(storeName, 'readwrite', async (stores) => {
    for (const value of values) {
      await reqAsPromise(stores[storeName].put(value));
    }
  });
}

export async function delByKey(
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  return tx<void>(storeName, 'readwrite', async (stores) => {
    await reqAsPromise(stores[storeName].delete(key));
  });
}

export async function clearStore(storeName: string): Promise<void> {
  return tx<void>(storeName, 'readwrite', async (stores) => {
    await reqAsPromise(stores[storeName].clear());
  });
}
