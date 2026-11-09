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
  if (fmt === 'pptx') return (await import('./exportPptx.js')).pptxBlob(slides, photos, meta);
  return (await import('./exportPdf.js')).pdfBlob(slides, photos, meta);
}

export const MIME = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};
