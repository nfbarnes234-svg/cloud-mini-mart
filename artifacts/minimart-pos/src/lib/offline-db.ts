// Lightweight IndexedDB wrapper for offline caching + a pending-sales queue.
// No extra dependency — uses the native IndexedDB API directly.

const DB_NAME = "minimart-offline";
const DB_VERSION = 1;

const STORE_CACHE = "cache"; // key/value store for cached lists (products, customers)
const STORE_PENDING_SALES = "pendingSales"; // queue of sales created while offline

export type PendingSale = {
  localId: string;
  createdAt: string;
  payload: {
    customerId?: number;
    items: { productId: number; quantity: number; unitPrice: number; discount: number }[];
    discount: number;
    tax: number;
    paymentMethod: string;
    amountPaid: number;
  };
  // Snapshot used to render a receipt immediately, before the server confirms.
  receiptPreview: {
    invoiceNumber: string;
    createdAt: string;
    cashierName: string;
    items: { id: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
    subtotal: number;
    total: number;
    amountPaid: number;
    changeDue: number;
    paymentMethod: string;
  };
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
      if (!db.objectStoreNames.contains(STORE_PENDING_SALES)) {
        db.createObjectStore(STORE_PENDING_SALES, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function idbRequestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Generic cache (products / customers snapshots) ------------------------

export async function setCached<T>(key: string, value: T): Promise<void> {
  await withStore(STORE_CACHE, "readwrite", (store) => idbRequestToPromise(store.put(value, key)));
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  return withStore(STORE_CACHE, "readonly", (store) => idbRequestToPromise(store.get(key)));
}

// --- Pending sales queue -----------------------------------------------------

export async function addPendingSale(sale: PendingSale): Promise<void> {
  await withStore(STORE_PENDING_SALES, "readwrite", (store) => idbRequestToPromise(store.put(sale)));
}

export async function getPendingSales(): Promise<PendingSale[]> {
  return withStore(STORE_PENDING_SALES, "readonly", (store) => idbRequestToPromise(store.getAll()));
}

export async function removePendingSale(localId: string): Promise<void> {
  await withStore(STORE_PENDING_SALES, "readwrite", (store) => idbRequestToPromise(store.delete(localId)));
}

export async function countPendingSales(): Promise<number> {
  const all = await getPendingSales();
  return all.length;
}
