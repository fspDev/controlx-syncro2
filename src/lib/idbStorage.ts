// Almacenamiento persistente basado en IndexedDB para el store de Zustand.
// localStorage tiene un límite de ~5-10MB, insuficiente para planillas con
// varias imágenes en base64. IndexedDB permite cientos de MB.

const DB_NAME = 'controlx-idb'
const STORE_NAME = 'kv'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet(name: string): Promise<string | null> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(name)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  }))
}

function idbSet(name: string, value: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function idbRemove(name: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const existing = await idbGet(name)
    if (existing != null) return existing
    // Migración única desde localStorage (donde vivía antes de este cambio)
    try {
      const legacy = localStorage.getItem(name)
      if (legacy != null) {
        await idbSet(name, legacy)
        return legacy
      }
    } catch {
      // localStorage inaccesible — ignorar
    }
    return null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await idbRemove(name)
  },
}
