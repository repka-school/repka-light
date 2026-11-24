import { STORAGE_KEY } from "./storage";

// On origins without Web Locks, IndexedDB still serializes readwrite transactions
// on the same object store. The learner's data stays under its existing localStorage key.
async function withDatabaseLock<T>(write: () => T): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(STORAGE_KEY + ".lock", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("writers");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("writers", "readwrite");
      const request = transaction.objectStore("writers").get(0);
      transaction.onabort = () => reject(transaction.error);
      request.onsuccess = () => {
        // The exclusive transaction is active throughout this synchronous callback.
        try {
          resolve(write());
        } catch (error) {
          reject(error);
        }
      };
    });
  } finally {
    db.close();
  }
}

export async function withWriteLock<T>(apply: (persistent: boolean) => T): Promise<T> {
  let acquired = false;
  const write = () => {
    acquired = true;
    return apply(true);
  };
  try {
    if (window.navigator.locks) return await window.navigator.locks.request(STORAGE_KEY, write);
  } catch (error) {
    if (acquired) throw error;
  }
  try {
    return await withDatabaseLock(write);
  } catch (error) {
    if (acquired) throw error;
    // Keep the visit usable without issuing an unlocked write to shared storage.
    return apply(false);
  }
}
