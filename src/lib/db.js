// IndexedDB wrapper. Records live in "cases" / "trainings"; every photo lives in
// "photos" as the ORIGINAL file (a Blob), so nothing is ever downscaled or re-encoded.
const DB_NAME = 'hik-field-reports';
const DB_VER = 1;
const STORES = ['cases', 'trainings', 'photos'];

let dbPromise = null;
let memMode = false;
const mem = { cases: new Map(), trainings: new Map(), photos: new Map(), meta: new Map() };

export const isMemMode = () => memMode;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        STORES.forEach((s) => d.createObjectStore(s, { keyPath: 'id' }));
        d.createObjectStore('meta');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('blocked'));
    } catch (e) {
      rej(e);
    }
  }).catch(() => {
    memMode = true;
    return null;
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const d = await openDB();
  if (!d) return null;
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    let out;
    const rq = fn(t.objectStore(store));
    if (rq) rq.onsuccess = () => (out = rq.result);
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('aborted'));
  });
}

export const dbAll = async (s) => {
  const r = await tx(s, 'readonly', (o) => o.getAll());
  return memMode ? [...mem[s].values()] : r || [];
};
export const dbGet = async (s, id) => {
  const r = await tx(s, 'readonly', (o) => o.get(id));
  return memMode ? mem[s].get(id) : r;
};
export const dbKeys = async (s) => {
  const r = await tx(s, 'readonly', (o) => o.getAllKeys());
  return memMode ? [...mem[s].keys()] : r || [];
};
export const dbPut = async (s, v) => {
  await tx(s, 'readwrite', (o) => o.put(v));
  if (memMode) mem[s].set(v.id, v);
};
export const dbDel = async (s, id) => {
  await tx(s, 'readwrite', (o) => o.delete(id));
  if (memMode) mem[s].delete(id);
};
export const metaGet = async (k) => {
  const r = await tx('meta', 'readonly', (o) => o.get(k));
  return memMode ? mem.meta.get(k) : r;
};
export const metaSet = async (k, v) => {
  await tx('meta', 'readwrite', (o) => o.put(v, k));
  if (memMode) mem.meta.set(k, v);
};
