// Native (vector) PDF: real text, real shapes and the ORIGINAL photo bytes embedded as-is
// (JPEGs are passed through untouched by jsPDF; PNGs are stored losslessly).
import { W, H, C, imagePlacement } from './geometry.js';

const K = 0.75; // canvas px -> pt (1273px x 850px page = 954.75pt x 637.5pt)
const rgb = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
const f = (n) => (+n).toFixed(3);

// Standard PDF fonts only cover Latin-1/WinAnsi. Anything else is mapped to its base letter or "?".
const WIN = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
function pdfSafe(s) {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (ch === '\n') out += ch;
    else if (c < 32) continue;
    else if (c <= 0xff || WIN.has(ch)) out += ch;
    else {
      const d = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      out += d.length === 1 && d.charCodeAt(0) <= 0xff ? d : '?';
    }
  }
  return out;
}

const fontStyle = (b, i) => (b && i ? 'bolditalic' : b ? 'bold' : i ? 'italic' : 'normal');

/** Greedy word wrap that mimics `white-space: pre-wrap; overflow-wrap: break-word`. */
function wrap(doc, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '', lw = 0;
    const push = () => { out.push(line.replace(/ +$/, '')); line = ''; lw = 0; };
    for (const tok of para.split(/( +)/)) {
      if (!tok) continue;
      const isSpace = tok[0] === ' ';
      const w = doc.getTextWidth(tok);
      if (!isSpace && lw + w > maxW && line.trim() !== '') push();
      if (!isSpace && w > maxW) {          // a single word wider than the box: break it by characters
        for (const ch of tok) {
          const cw = doc.getTextWidth(ch);
          if (lw + cw > maxW && line !== '') push();
          line += ch; lw += cw;
        }
        continue;
      }
      line += tok; lw += w;
    }
    push();
  }
  return out;
}

const BASELINE = 0.9465; // Arial: baseline offset inside a 1.2 line box, in em

function drawRect(doc, p) {
  const x = p.x * K, y = p.y * K, w = p.w * K, h = p.h * K;
  doc.setFillColor(...rgb(p.fill));
  if (p.round) doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 'F');
  else if (p.r) doc.roundedRect(x, y, w, h, p.r * K, p.r * K, 'F');
  else doc.rect(x, y, w, h, 'F');
  if (p.line) {
    const lw = p.lw * K, i = lw / 2;
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(p.line));
    if (p.round) doc.ellipse(x + w / 2, y + h / 2, w / 2 - i, h / 2 - i, 'S');
    else if (p.r) doc.roundedRect(x + i, y + i, w - lw, h - lw, Math.max(0, p.r * K - i), Math.max(0, p.r * K - i), 'S');
    else doc.rect(x + i, y + i, w - lw, h - lw, 'S');
  }
}

function drawPara(doc, p) {
  const o = 0.25 * Math.min(p.w, p.h);
  doc.setFillColor(...rgb(p.fill));
  doc.lines([[(p.w - o) * K, 0], [-o * K, p.h * K], [-(p.w - o) * K, 0]], (p.x + o) * K, p.y * K, [1, 1], 'F', true);
}

function drawText(doc, p) {
  const size = p.size * K, lh = size * 1.2;
  const x = p.x * K, y = p.y * K, w = p.w * K, h = p.h * K;
  doc.setFont('helvetica', fontStyle(p.bold, p.italic));
  doc.setFontSize(size);

  if (p.text === '✓') {               // helvetica has no check glyph: draw it as a stroke
    const cx = x + w / 2, cy = y + h / 2, u = K;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.9 * u);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    doc.lines([[2.6 * u, 2.8 * u], [4.9 * u, -5.8 * u]], cx - 3.6 * u, cy + 0.4 * u, [1, 1], 'S', false);
    return;
  }

  if (Array.isArray(p.text)) {        // coloured runs on one line (footer tagline)
    const nh = lh;
    const top = p.valign === 'middle' ? y + (h - nh) / 2 : p.valign === 'bottom' ? y + h - nh : y;
    let cx = x;
    for (const r of p.text) {
      doc.setTextColor(...rgb(r.color || p.color));
      doc.text(pdfSafe(r.text), cx, top + BASELINE * size);
      cx += doc.getTextWidth(pdfSafe(r.text));
    }
    return;
  }

  const ls = wrap(doc, pdfSafe(p.text), w);
  const nh = ls.length * lh;
  const top = p.valign === 'middle' ? y + (h - nh) / 2 : p.valign === 'bottom' ? y + h - nh : y;
  doc.setTextColor(...rgb(p.color));
  ls.forEach((l, i) => {
    if (!l) return;
    const by = top + i * lh + BASELINE * size;
    if (p.align === 'center') doc.text(l, x + w / 2, by, { align: 'center' });
    else if (p.align === 'right') doc.text(l, x + w, by, { align: 'right' });
    else doc.text(l, x, by);
  });
}

function drawTable(doc, p) {
  const size = p.size * K, lh = size * 1.2;
  let y = p.y * K;
  for (const r of p.rows) {
    const cells = r.map((c, i) => {
      doc.setFont('helvetica', fontStyle(c.bold, false));
      doc.setFontSize(size);
      return wrap(doc, pdfSafe(c.text || ''), p.cols[i] * K);
    });
    const rowH = Math.max(p.rowH * K, Math.max(...cells.map((l) => l.length)) * lh);
    let x = p.x * K;
    cells.forEach((ls, i) => {
      doc.setFont('helvetica', fontStyle(r[i].bold, false));
      doc.setFontSize(size);
      doc.setTextColor(...rgb(r[i].color || C.ink));
      ls.forEach((l, j) => { if (l) doc.text(l, x, y + j * lh + BASELINE * size); });
      x += p.cols[i] * K;
    });
    y += rowH;
  }
}

function drawImg(doc, p, photos, pageH) {
  const ph = p.photo && photos[p.photo];
  if (!ph) {
    drawRect(doc, { x: p.x, y: p.y, w: p.w, h: p.h, fill: 'EDEDED', line: null });
    drawText(doc, { x: p.x, y: p.y, w: p.w, h: p.h, text: 'No photo', size: 13, color: '888888', align: 'center', valign: 'middle' });
    return;
  }
  const fmt = ph.mime === 'image/png' ? 'PNG' : 'JPEG';
  const pl = imagePlacement(p, ph.width, ph.height);
  if (pl.crop) {
    // "Fill frame": the full-resolution picture is placed larger than the frame and clipped to it.
    const { l, r, t, b } = pl.crop;
    const fw = p.w / (1 - l - r), fh = p.h / (1 - t - b);
    doc.internal.write('q');
    doc.internal.write(`${f(p.x * K)} ${f(pageH - (p.y + p.h) * K)} ${f(p.w * K)} ${f(p.h * K)} re W n`);
    doc.addImage(ph.bytes, fmt, (p.x - l * fw) * K, (p.y - t * fh) * K, fw * K, fh * K, ph.id, 'NONE');
    doc.internal.write('Q');
  } else {
    doc.addImage(ph.bytes, fmt, pl.x * K, pl.y * K, pl.w * K, pl.h * K, ph.id, 'NONE');
  }
}

export async function buildPdf(slides, photos, meta = {}, jsPDFCtor) {
  if (!jsPDFCtor) jsPDFCtor = (await import('jspdf')).jsPDF;
  const pw = W * K, ph = H * K;
  const doc = new jsPDFCtor({ orientation: 'landscape', unit: 'pt', format: [pw, ph], compress: true });
  doc.setProperties({ title: meta.title || 'Field report', author: meta.author || 'Frank Magai', creator: 'Hikvision Field Reports' });
  slides.forEach((prims, i) => {
    if (i) doc.addPage([pw, ph], 'landscape');
    for (const p of prims) {
      if (p.t === 'rect') drawRect(doc, p);
      else if (p.t === 'para') drawPara(doc, p);
      else if (p.t === 'text') drawText(doc, p);
      else if (p.t === 'tbl') drawTable(doc, p);
      else if (p.t === 'img') drawImg(doc, p, photos, ph);
    }
  });
  return doc;
}

export async function pdfBlob(slides, photos, meta) {
  return (await buildPdf(slides, photos, meta)).output('blob');
}
