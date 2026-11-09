// Photo pipeline.
//  - The ORIGINAL file is stored untouched (same bytes, same resolution) whenever possible.
//  - It is only re-encoded when it cannot be embedded correctly as-is:
//      * a JPEG whose EXIF says "rotated" (PowerPoint/PDF ignore EXIF, so the rotation is baked in),
//      * a format PowerPoint/PDF can't use (WebP, HEIC, AVIF, GIF, BMP...) -> converted to JPEG at full size.
//  - A small thumbnail is kept next to it purely so lists and the form stay fast.
import { dbGet, dbPut, dbDel, dbKeys } from './db.js';
import { uid } from './helpers.js';

function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  return 'other';
}

/** EXIF orientation (1-8) of a JPEG, or 1 when absent. */
export function exifOrientation(b) {
  try {
    let p = 2;
    while (p < b.length - 4) {
      if (b[p] !== 0xff) break;
      const marker = b[p + 1];
      const len = (b[p + 2] << 8) | b[p + 3];
      if (marker === 0xe1 && b[p + 4] === 0x45 && b[p + 5] === 0x78 && b[p + 6] === 0x69 && b[p + 7] === 0x66) {
        const t = p + 10; // TIFF header
        const le = b[t] === 0x49;
        const u16 = (o) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
        const u32 = (o) =>
          le
            ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
            : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
        const ifd = t + u32(t + 4);
        const n = u16(ifd);
        for (let i = 0; i < n; i++) {
          const e = ifd + 2 + i * 12;
          if (u16(e) === 0x0112) return u16(e + 8) || 1;
        }
        return 1;
      }
      if (marker === 0xda) break;
      p += 2 + len;
    }
  } catch (_) { /* ignore */ }
  return 1;
}

function loadImg(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('decode'));
    i.src = url;
  });
}

function canvasBlob(cv, type, q) {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q));
}

async function decode(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const im = await loadImg(url);
    return { im, width: im.naturalWidth, height: im.naturalHeight };
  } finally {
    // image already decoded; safe to revoke after draw, so revoke lazily
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

async function reencodeFull(blob, type = 'image/jpeg', q = 0.95) {
  const { im, width, height } = await decode(blob);
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const g = cv.getContext('2d');
  if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, width, height); }
  g.drawImage(im, 0, 0, width, height);
  return { blob: await canvasBlob(cv, type, q), width, height };
}

async function makeThumb(blob, max = 720) {
  const { im, width, height } = await decode(blob);
  const k = Math.min(1, max / Math.max(width, height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(width * k));
  cv.height = Math.max(1, Math.round(height * k));
  const g = cv.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(im, 0, 0, cv.width, cv.height);
  return canvasBlob(cv, 'image/jpeg', 0.82);
}

/** Store a picked/captured file. Returns the photo record (without blobs being re-read). */
export async function ingestPhoto(file, opts = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  let blob = file, type, width, height, converted = false;

  if (kind === 'jpeg') {
    type = 'image/jpeg';
    const o = exifOrientation(bytes);
    if (o > 1) {
      const r = await reencodeFull(file, 'image/jpeg', 0.97);
      blob = r.blob; width = r.width; height = r.height; converted = true;
    } else {
      const d = await decode(file);
      width = d.width; height = d.height;
      if (file.type !== 'image/jpeg') blob = new Blob([bytes], { type });
    }
  } else if (kind === 'png') {
    type = 'image/png';
    const d = await decode(file);
    width = d.width; height = d.height;
    if (file.type !== 'image/png') blob = new Blob([bytes], { type });
  } else {
    const r = await reencodeFull(file, 'image/jpeg', 0.95); // throws if the browser can't read it
    blob = r.blob; type = 'image/jpeg'; width = r.width; height = r.height; converted = true;
  }

  const thumb = await makeThumb(blob);
  const rec = {
    id: opts.id || uid() + uid(),
    blob, thumb, type, width, height,
    size: blob.size,
    originalSize: file.size,
    name: file.name || 'photo',
    converted,
    created: Date.now(),
  };
  await dbPut('photos', rec);
  return rec;
}

export const getPhoto = (id) => dbGet('photos', id);

export async function deletePhotos(ids) {
  for (const id of new Set(ids.filter(Boolean))) await dbDel('photos', id);
}

export async function clonePhoto(id) {
  const p = await dbGet('photos', id);
  if (!p) return null;
  const c = { ...p, id: uid() + uid(), created: Date.now() };
  await dbPut('photos', c);
  return c.id;
}

export const photoKeys = (rec) => Object.keys(rec).filter((k) => k.startsWith('photo_') && rec[k]).map((k) => rec[k]);

/** Remove photos no record points to (crash leftovers). Only call after records loaded OK. */
export async function collectGarbage(records) {
  const used = new Set(records.flatMap(photoKeys));
  const all = await dbKeys('photos');
  await deletePhotos(all.filter((id) => !used.has(id)));
}

/** Everything the exporters need: the untouched original bytes + pixel size. */
export async function loadExportPhoto(id) {
  const p = await dbGet('photos', id);
  if (!p) return null;
  const bytes = new Uint8Array(await p.blob.arrayBuffer());
  return { id, bytes, mime: p.type, width: p.width, height: p.height };
}
