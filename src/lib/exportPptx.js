import { W, H, C, imagePlacement } from './geometry.js';
import { bytesToBase64 } from './helpers.js';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const IN = 13.333 / W;   // canvas px -> inches
const PT = 0.754;        // canvas px -> points

function drawImage(sl, p, photos, S) {
  const g = { x: p.x * IN, y: p.y * IN, w: p.w * IN, h: p.h * IN };
  const ph = p.photo && photos[p.photo];
  if (!ph) {
    sl.addShape(S.rect, { ...g, fill: { color: 'EDEDED' }, line: { type: 'none' } });
    sl.addText('No photo', { ...g, align: 'center', valign: 'middle', fontSize: 10, color: '888888', fontFace: 'Arial', margin: 0 });
    return;
  }
  // The ORIGINAL file bytes go straight into the .pptx - no resize, no re-encode.
  const data = `${ph.mime};base64,${bytesToBase64(ph.bytes)}`;
  const pl = imagePlacement(p, ph.width, ph.height);
  if (pl.crop) {
    // "Fill frame": PowerPoint crops the full-size picture to the frame (srcRect), nothing is thrown away.
    sl.addImage({
      data, x: g.x, y: g.y,
      w: ph.width / 100, h: ph.height / 100,           // only the aspect ratio matters here
      sizing: { type: 'cover', w: g.w, h: g.h },
    });
  } else {
    sl.addImage({ data, x: pl.x * IN, y: pl.y * IN, w: pl.w * IN, h: pl.h * IN });
  }
}

function drawSlide(sl, prims, photos, pptx) {
  const S = pptx.ShapeType;
  for (const p of prims) {
    const g = { x: p.x * IN, y: p.y * IN, w: p.w * IN, h: p.h * IN };
    if (p.t === 'rect') {
      const shape = p.round ? S.ellipse : (p.r ? S.roundRect : S.rect);
      const o = { ...g, fill: { color: p.fill }, line: p.line ? { color: p.line, width: p.lw * PT } : { type: 'none' } };
      if (p.r && !p.round) o.rectRadius = p.r * IN;
      sl.addShape(shape, o);
    } else if (p.t === 'para') {
      sl.addShape(S.parallelogram, { ...g, fill: { color: p.fill }, line: { type: 'none' } });
    } else if (p.t === 'text') {
      const base = { bold: p.bold, italic: p.italic, color: p.color, fontFace: 'Arial', fontSize: +(p.size * PT).toFixed(1) };
      const txt = Array.isArray(p.text) ? p.text.map((r) => ({ text: r.text, options: { color: r.color } })) : String(p.text);
      sl.addText(txt, { ...g, ...base, align: p.align, valign: p.valign, margin: 0, fit: 'none', wrap: true, paraSpaceAfter: 0 });
    } else if (p.t === 'img') {
      drawImage(sl, p, photos, S);
    } else if (p.t === 'tbl') {
      const rows = p.rows.map((r) => r.map((c) => ({
        text: c.text,
        options: { fontFace: 'Arial', fontSize: +(p.size * PT).toFixed(1), color: c.color || C.ink, bold: !!c.bold, valign: p.valign, margin: [0, 0, 0, 0] },
      })));
      sl.addTable(rows, { x: p.x * IN, y: p.y * IN, colW: p.cols.map((c) => c * IN), rowH: p.rows.map(() => p.rowH * IN), border: { type: 'none' }, autoPage: false, margin: [0, 0, 0, 0] });
    }
  }
}

/** slides: primitives; photos: { [id]: {bytes, mime, width, height} } */
export async function buildPptx(slides, photos, meta = {}, PptxGenJS) {
  if (!PptxGenJS) PptxGenJS = (await import('pptxgenjs')).default;
  const p = new PptxGenJS();
  p.defineLayout({ name: 'HIK', width: W * IN, height: H * IN });
  p.layout = 'HIK';
  p.title = meta.title || 'Field report';
  p.author = meta.author || 'Frank Magai';
  p.company = 'Hikvision';
  slides.forEach((s) => drawSlide(p.addSlide(), s, photos, p));
  return p;
}

export async function pptxBlob(slides, photos, meta) {
  const p = await buildPptx(slides, photos, meta);
  const out = await p.write({ outputType: 'blob' });
  // JSZip labels its output "application/zip"; relabel it as a real PowerPoint file.
  return new Blob([out], { type: PPTX_MIME });
}
