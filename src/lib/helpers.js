export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = (n, l = 2) => String(n).padStart(l, '0');
export const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const ord = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${ord(d)} ${MON[m - 1]} ${y}`;
};
export const lines = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
export const safeName = (s) =>
  String(s || 'report').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'report';
export const seq = (list, prefix, date) => {
  const d = date || today();
  return `${prefix}-${d.slice(0, 4)}-${d.slice(5).replace('-', '')}-${pad(list.length + 1, 3)}`;
};
export const fmtBytes = (n) => {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
};
const MIME_BY_EXT = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  json: 'application/json',
};
/**
 * Saves a blob as a file. The blob is always re-labelled with the MIME type that matches the file
 * extension: pptxgenjs/JSZip hand back "application/zip", and phone browsers trust that type over the
 * ".pptx" name, which is why phones used to save a .zip instead of a PowerPoint file.
 */
export function saveBlob(blob, name) {
  const ext = String(name).split('.').pop().toLowerCase();
  const type = MIME_BY_EXT[ext] || blob.type || 'application/octet-stream';
  const file = blob.type === type ? blob : new Blob([blob], { type });
  const a = document.createElement('a');
  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 60000);
}
export function bytesToBase64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
export function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
export async function dataURLToBlob(url) {
  const r = await fetch(url);
  return r.blob();
}
