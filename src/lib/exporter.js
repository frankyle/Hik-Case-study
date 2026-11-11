// Turns a saved record into a downloadable PPTX / PDF using the original stored photos.
import { KINDS, cleanForExport } from './kinds.js';
import { slidePhotoIds } from './geometry.js';
import { loadExportPhoto } from './photos.js';

export async function prepare(kindKey, rec) {
  const K = KINDS[kindKey];
  const slides = K.slides(cleanForExport(rec));
  const photos = {};
  for (const id of slidePhotoIds(slides)) {
    const p = await loadExportPhoto(id);
    if (p) photos[id] = p;
  }
  return { slides, photos, meta: { title: K.title(rec) } };
}

export async function makeFile(kindKey, rec, fmt) {
  const { slides, photos, meta } = await prepare(kindKey, rec);
  const blob = fmt === 'pptx'
    ? await (await import('./exportPptx.js')).pptxBlob(slides, photos, meta)
    : await (await import('./exportPdf.js')).pdfBlob(slides, photos, meta);
  return new Blob([blob], { type: MIME[fmt] });
}

/**
 * One file holding several saved records: all their slides, in the order given.
 * onProgress(done, total) is called after each record's photos are loaded.
 */
export async function makeCombined(kindKey, recs, fmt, onProgress) {
  const K = KINDS[kindKey];
  const slides = [];
  const photos = {};
  let n = 0;
  for (const rec of recs) {
    const s = K.slides(cleanForExport(rec));
    for (const id of slidePhotoIds(s)) {
      if (photos[id]) continue;
      const p = await loadExportPhoto(id);
      if (p) photos[id] = p;
    }
    slides.push(...s);
    onProgress && onProgress(++n, recs.length);
  }
  const meta = { title: `${K.plural} (${recs.length})` };
  const blob = fmt === 'pptx'
    ? await (await import('./exportPptx.js')).pptxBlob(slides, photos, meta)
    : await (await import('./exportPdf.js')).pdfBlob(slides, photos, meta);
  return new Blob([blob], { type: MIME[fmt] });
}

export const MIME = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};
