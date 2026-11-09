// Report geometry shared by the on-screen preview, the PPTX export and the PDF export.
// A "slide" is a list of primitives on a fixed 1273 x 850 canvas.
import { lines, fmtDate } from './helpers.js';

export const W = 1273, H = 850;
export const C = { red: 'E31E24', dark: '2B3A42', green: '7AB929', tint: 'EAF4DB', line: 'CFE3B0', grey: 'D9D9D9', ink: '222222', mute: '666666' };

const R = (x, y, w, h, o = {}) => ({ t: 'rect', x, y, w, h, fill: o.fill || 'FFFFFF', line: o.line || null, lw: o.lw || 1, r: o.r || 0, round: !!o.round });
const P = (x, y, w, h, fill) => ({ t: 'para', x, y, w, h, fill });
const T = (x, y, w, h, text, o = {}) => ({ t: 'text', x, y, w, h, text, size: o.size || 13, bold: !!o.bold, italic: !!o.italic, color: o.color || C.ink, align: o.align || 'left', valign: o.valign || 'top' });
const I = (x, y, w, h, photo, fit) => ({ t: 'img', x, y, w, h, photo: photo || null, fit: fit === 'whole' ? 'whole' : 'fill' });
const TB = (x, y, cols, rows, o = {}) => ({ t: 'tbl', x, y, cols, rows, size: o.size || 12.5, rowH: o.rowH || 20, valign: o.valign || 'top' });

const nLines = (text, w, size) =>
  String(text).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil((l.length * size * 0.53) / w)), 0);
function fitSize(text, w, h, max = 13) {
  for (let s = max; s >= 9; s -= 1) if (nLines(text, w, s) * s * 1.25 <= h) return s;
  return 9;
}

/** Where an image lands inside its frame, plus the crop (as fractions of the source) for "fill". */
export function imagePlacement(p, imgW, imgH) {
  if (p.fit === 'whole') {
    const k = Math.min(p.w / imgW, p.h / imgH);
    const w = imgW * k, h = imgH * k;
    return { x: p.x + (p.w - w) / 2, y: p.y + (p.h - h) / 2, w, h, crop: null };
  }
  const fr = p.w / p.h, ir = imgW / imgH;
  let l = 0, t = 0;
  if (ir > fr) l = (1 - fr / ir) / 2;
  else t = (1 - ir / fr) / 2;
  return { x: p.x, y: p.y, w: p.w, h: p.h, crop: { l, r: l, t, b: t } };
}


// ---- Photo evidence -------------------------------------------------------------------------
// The photo area is x 754..1241, y 133..759. It adapts to 1-4 photos; each photo sits in its own card
// with a caption (the "kind of image" the user picked) and a green frame.
const PA = { x: 754, y: 133, w: 487, h: 626, gap: 8 };

function capSize(text, w, h) {
  for (let s = 12.5; s >= 9; s -= 0.5) {
    const n = Math.ceil((String(text).length * s * 0.66) / w);   // bold capitals are wide
    if (n * s * 1.25 <= h) return s;
  }
  return 9;
}

function photoCell(x, y, w, h, ph, fw, fh) {
  const cap = String(ph.caption || '').toUpperCase();
  const fx = x + (w - fw) / 2, fy = y + 40 + (h - 48 - fh) / 2;
  return [
    R(x, y, w, h, { fill: 'FFFFFF', line: C.line, r: 8 }),
    T(x + 8, y + 6, w - 16, 32, cap, { size: capSize(cap, w - 16, 32), bold: true, align: 'center', valign: 'middle' }),
    R(fx, fy, fw, fh, { fill: C.tint, line: C.green, lw: 2 }),
    I(fx + 10, fy + 10, fw - 20, fh - 20, ph.photo, ph.fit),
  ];
}

/** photos: [{ caption, photo, fit }], 1 to 4 of them. */
function photoBlock(photos) {
  const { x, y, w, h, gap } = PA, n = photos.length, out = [];
  const half = (w - gap) / 2, rowH = (h - gap) / 2, x2 = x + half + gap, y2 = y + rowH + gap;
  if (n === 1) out.push(...photoCell(x, y, w, h, photos[0], 420, h - 48));
  else if (n === 2) photos.forEach((p, i) => out.push(...photoCell(x, y + i * (rowH + gap), w, rowH, p, 340, rowH - 48)));
  else if (n === 3) {
    const top = 294, bot = h - top - gap;
    out.push(...photoCell(x, y, half, top, photos[0], half - 30, top - 48));
    out.push(...photoCell(x2, y, half, top, photos[1], half - 30, top - 48));
    out.push(...photoCell(x, y + top + gap, w, bot, photos[2], 236, bot - 48));
  } else {
    photos.slice(0, 4).forEach((p, i) => out.push(...photoCell(i % 2 ? x2 : x, i < 2 ? y : y2, half, rowH, p, half - 30, rowH - 48)));
  }
  return out;
}

/** The kinds of picture a support case can hold. Each photo slot lets the engineer pick one. */
export const PHOTO_TYPES = [
  'Products used (Hikvision)', 'Site photo', 'Engineer with technician (on-site support)',
  'Error image', 'Configuration image', 'Problem solved image',
];
export const OTHER_TYPE = 'Other (type your own label)';
export const CASE_SLOTS = ['products', 'site', 'engineer', 'extra'];
export const DEFAULT_TYPE = { products: PHOTO_TYPES[0], site: PHOTO_TYPES[1], engineer: PHOTO_TYPES[2], extra: PHOTO_TYPES[5] };

/** 3 slots by default; a 4th appears once the user adds it (or when it already holds a photo). */
export const slotCount = (d) => (Number(d.photoCount) === 4 || d.photo_extra ? 4 : 3);
export const slotType = (d, k) => d['type_' + k] || DEFAULT_TYPE[k];
export const slotCaption = (d, k) => {
  const t = slotType(d, k);
  return t === OTHER_TYPE ? ((d['label_' + k] || '').trim() || 'Photo') : t;
};

function frame(title) {
  const labels = [['Professional', 500, 100], ['Reliable', 610, 100], ['Innovative', 720, 100], ['Customer Focused', 850, 140]];
  const out = [
    R(0, 0, W, H, { fill: 'FFFFFF', line: 'D0D0D0' }),
    T(30, 0, 290, 78, 'HIKVISION', { size: 38, bold: true, italic: true, color: C.red, valign: 'middle' }),
    P(300, 0, 75, 78, C.green), P(335, 0, 700, 78, C.dark),
    T(365, 0, 640, 78, title, { size: 30, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }),
    P(1005, 0, 268, 78, C.green),
    T(1062, 0, 205, 78, 'See Far, Go Further', { size: 16, bold: true, color: 'FFFFFF', valign: 'middle' }),
    R(0, 778, W, 72, { fill: C.dark }),
    T(75, 778, 420, 72, [{ text: 'Reliable Solutions. ', color: 'FFFFFF' }, { text: 'Expert Support.', color: C.green }], { size: 15, bold: true, valign: 'middle' }),
  ];
  labels.forEach(([l, cx, w], i) => {
    out.push(R(cx - 4, 797, 8, 8, { fill: C.green, round: true }));
    out.push(T(cx - w / 2, 811, w, 20, l, { size: 12, color: 'FFFFFF', align: 'center' }));
    if (i < 3) out.push(R(cx + w / 2 + ((labels[i + 1][1] - labels[i + 1][2] / 2) - (cx + w / 2)) / 2, 792, 1, 46, { fill: '5B6B73' }));
  });
  out.push(P(965, 778, 308, 72, C.green), T(1030, 778, 235, 72, 'See Far, Go Further', { size: 16, bold: true, color: 'FFFFFF', valign: 'middle' }));
  return out;
}

function secHeader(x, top, title, barW) {
  return [
    R(x, top, 46, 46, { fill: C.green, r: 7 }),
    R(x + 13, top + 13, 20, 20, { fill: C.green, line: 'FFFFFF', lw: 3, round: true }),
    R(x + 46, top, barW, 30, { fill: C.dark }),
    T(x + 59, top, barW - 12, 30, title.toUpperCase(), { size: 16.5, bold: true, color: 'FFFFFF', valign: 'middle' }),
  ];
}

const LEFT_TOPS = [93, 278, 407, 532, 637], LEFT_H = [160, 103, 99, 83, 108];

function reportSlide(cfg) {
  const o = frame(cfg.title);
  cfg.left.forEach((s, i) => {
    const top = LEFT_TOPS[i], h = LEFT_H[i];
    o.push(R(23, top + 17, 417, h, { fill: 'FFFFFF', line: C.line, r: 8 }));
    o.push(...secHeader(23, top, `${i + 1}. ${s.title}`, 316));
    if (s.kind === 'rows') {
      const rows = s.rows.map(([l, v, st]) => [{ text: '•  ' + l }, { text: ':' }, Object.assign({ text: v || '' }, st || {})]);
      o.push(TB(76, top + 38, [134, 14, 182], rows, { size: 12.5, rowH: 20 }));
    } else {
      const bullet = s.kind === 'bullets' || (s.kind === 'auto' && lines(s.text).length > 1);
      const txt = bullet ? lines(s.text).map((l) => '•  ' + l).join('\n') : (s.text || '');
      const w = 350, hh = h - 26;
      o.push(T(76, top + 34, w, hh, txt, { size: fitSize(txt, w, hh) }));
    }
  });
  const ot = 97;
  o.push(R(460, ot + 17, 271, 367, { fill: 'FFFFFF', line: C.line, r: 8 }));
  o.push(...secHeader(460, ot, `${cfg.outNum}. Outcome`, 225));
  let y = 160;
  lines(cfg.outcome).slice(0, 7).forEach((it) => {
    const n = nLines(it, 208, 13), hh = n * 16;
    o.push(R(477, y + hh / 2 - 10, 20, 20, { fill: C.green, round: true }));
    o.push(T(481, y + hh / 2 - 10, 12, 20, '✓', { size: 12, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }));
    o.push(T(509, y, 212, hh, it, { size: 13, valign: 'middle' }));
    y += hh + 30;
  });
  const ty = 497, rh = 43.2;
  cfg.table.forEach(([l, v, st], i) => {
    const yy = ty + i * rh;
    o.push(R(462, yy, 269, rh, { fill: 'FFFFFF', line: C.grey }));
    o.push(R(508, yy, 1, rh, { fill: C.grey }), R(600, yy, 1, rh, { fill: C.grey }));
    o.push(R(475, yy + rh / 2 - 9, 18, 18, { fill: C.green, r: 4 }), R(480, yy + rh / 2 - 4, 8, 8, { fill: 'FFFFFF', round: true }));
    o.push(T(514, yy, 82, rh, l, { size: 12.5, valign: 'middle' }));
    o.push(T(606, yy, 122, rh, v || '', Object.assign({ size: fitSize(v || '', 122, rh - 6, 13), valign: 'middle' }, st || {})));
  });
  o.push(P(759, 93, 259, 32, C.green), T(784, 93, 230, 32, `${cfg.photoNum}. PHOTO EVIDENCE`, { size: 16, bold: true, color: 'FFFFFF', valign: 'middle' }));
  o.push(R(757, 127, 478, 1, { fill: C.grey }));
  o.push(...photoBlock(cfg.photos));
  return o;
}

/** Only slots that hold a photo go on the slide, so the layout always fits what was uploaded.
 *  With no photos yet, the empty slots are shown as placeholders. */
function casePhotos(d) {
  const all = CASE_SLOTS.slice(0, slotCount(d)).map((k) => ({ caption: slotCaption(d, k), photo: d['photo_' + k], fit: d['fit_' + k] }));
  const filled = all.filter((p) => p.photo);
  return filled.length ? filled : all;
}

export function caseSlides(d) {
  return [reportSlide({
    title: 'TECHNICAL SUPPORT CASE STUDY',
    left: [
      { title: 'Technician information', kind: 'rows', rows: [['Technician Name', d.techName], ['Company', d.techCompany], ['Position', d.techPosition], ['Experience', d.techExp], ['Specialization', d.techSpec], ['Team Size', d.techTeam]] },
      { title: 'Site information', kind: 'rows', rows: [['Site Name', d.siteName], ['Site Type', d.siteType], ['Location', d.siteLocation], ['End User', d.endUser]] },
      { title: 'Support information', kind: 'rows', rows: [['Support Type', d.supportType ? `[${d.supportType}]` : '', { bold: true, color: '5E9A12' }], ['Products Used', lines(d.products).map((p) => '•  ' + p).join('\n')]] },
      { title: 'Technical issue', kind: 'text', text: d.issue },
      { title: 'Solution provided', kind: 'auto', text: d.solution },
    ],
    outNum: 6, outcome: d.outcome,
    table: [['Support Date', fmtDate(d.date)], ['Case ID', d.caseId], ['Support Engineer', d.engineer], ['Support Location', d.supportLocation], ['Time Spent', d.timeSpent], ['Case Status', d.status, { bold: true, color: '5E9A12' }]],
    photoNum: 7,
    photos: casePhotos(d),
  })];
}

export function trainCount(d) {
  const n = (d.participants || []).filter((p) => p.name && p.name.trim()).length;
  return d.count ? String(d.count) : (n ? String(n) : '');
}

export function trainingSlides(d) {
  const slides = [reportSlide({
    title: 'TECHNICAL TRAINING REPORT',
    left: [
      { title: 'Training information', kind: 'rows', rows: [['Programme', d.program], ['Company', d.company], ['Venue', d.venue], ['Training Date', fmtDate(d.date)], ['Week / Session', d.week], ['Duration', d.duration]] },
      { title: 'Trainer information', kind: 'rows', rows: [['Trainer Name', d.trainerName], ['Company', d.trainerCompany], ['Position', d.trainerPosition], ['Specialization', d.trainerSpec]] },
      { title: 'Required technicians', kind: 'text', text: d.audience },
      { title: 'Topics covered', kind: 'bullets', text: d.topics },
    ],
    outNum: 5, outcome: d.outcome,
    table: [['Training Date', fmtDate(d.date)], ['Session ID', d.sessionId], ['Trainer', d.trainerName], ['Technicians Trained', trainCount(d)], ['Duration', d.duration], ['Status', d.status, { bold: true, color: '5E9A12' }]],
    photoNum: 6,
    photos: [['classroom', 'Classroom teaching'], ['practical', 'Practical / hands-on'], ['group', 'Group photo with participants']]
      .map(([k, caption]) => ({ caption, photo: d['photo_' + k], fit: d['fit_' + k] })),
  })];
  const people = (d.participants || []).filter((p) => p.name && p.name.trim());
  const per = 14, pages = Math.ceil(people.length / per);
  for (let pg = 0; pg < pages; pg++) {
    const o = frame('TRAINING PARTICIPANTS');
    o.push(T(23, 92, 900, 32, [d.program, d.company, fmtDate(d.date)].filter(Boolean).join('   |   '), { size: 15, bold: true, color: C.dark, valign: 'middle' }));
    o.push(T(930, 92, 320, 32, `${people.length} technicians  (page ${pg + 1} of ${pages})`, { size: 13, color: C.mute, align: 'right', valign: 'middle' }));
    const cols = [['No', 23, 50], ['Full name', 73, 320], ['Company', 393, 260], ['Position', 653, 260], ['Qualification', 913, 337]];
    o.push(R(23, 132, 1227, 36, { fill: C.dark }));
    cols.forEach(([n, x, w]) => o.push(T(x + 10, 132, w - 14, 36, n, { size: 13, bold: true, color: 'FFFFFF', valign: 'middle' })));
    people.slice(pg * per, pg * per + per).forEach((p, i) => {
      const y = 168 + i * 43;
      o.push(R(23, y, 1227, 43, { fill: i % 2 ? 'F4F9EC' : 'FFFFFF', line: C.line }));
      const vals = [String(pg * per + i + 1), p.name, p.company, p.position, p.qualification];
      cols.forEach(([n, x, w], j) => o.push(T(x + 10, y, w - 14, 43, vals[j] || '', { size: 13, bold: j === 1, valign: 'middle' })));
    });
    slides.push(o);
  }
  return slides;
}

/** ids of every photo a set of slides uses */
export const slidePhotoIds = (slides) => [...new Set(slides.flat().filter((p) => p.t === 'img' && p.photo).map((p) => p.photo))];
