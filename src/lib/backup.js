// Backup = one JSON file holding the records AND the original photos (base64), so a restore on
// another browser/device brings back exactly the same pictures. Also reads backups from the old
// single-file HTML app (photos embedded in each record as data: URLs).
import { dbAll, dbGet, dbPut } from './db.js';
import { blobToDataURL, dataURLToBlob, today } from './helpers.js';
import { photoKeys, ingestPhoto } from './photos.js';
import { STORE_KEYS } from './kinds.js';

export async function makeBackup() {
  const data = { app: 'hik-field-reports', version: 2, exported: new Date().toISOString(), photos: [] };
  const ids = new Set();
  for (const s of STORE_KEYS) {
    data[s] = await dbAll(s);
    data[s].forEach((r) => photoKeys(r).forEach((id) => ids.add(id)));
  }
  for (const id of ids) {
    const p = await dbGet('photos', id);
    if (!p) continue;
    data.photos.push({ id, name: p.name, type: p.type, data: await blobToDataURL(p.blob) });
  }
  return {
    blob: new Blob([JSON.stringify(data)], { type: 'application/json' }),
    name: `hikvision-field-reports-backup-${today()}.json`,
  };
}

export async function restoreBackup(text) {
  const d = JSON.parse(text);
  let n = 0;
  // v2: photos travel inside the backup, keep their ids so records still point at them
  for (const p of d.photos || []) {
    const blob = await dataURLToBlob(p.data);
    await ingestPhoto(new File([blob], p.name || 'photo', { type: p.type || blob.type }), { id: p.id });
  }
  for (const s of STORE_KEYS) {
    for (const r of d[s] || []) {
      if (!r || !r.id) continue;
      // v1 (old HTML app): photos were inline data URLs -> move them into the photo store
      for (const k of Object.keys(r)) {
        if (k.startsWith('photo_') && typeof r[k] === 'string' && r[k].startsWith('data:')) {
          const blob = await dataURLToBlob(r[k]);
          const ph = await ingestPhoto(new File([blob], k + '.jpg', { type: blob.type }));
          r[k] = ph.id;
        }
      }
      await dbPut(s, r);
      n++;
    }
  }
  return n;
}
