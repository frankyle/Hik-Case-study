import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SlideView from './SlideView.jsx';
import { W, H } from '../lib/geometry.js';
import { KINDS, cleanForExport } from '../lib/kinds.js';
import { slidePhotoIds } from '../lib/geometry.js';
import { getPhoto } from '../lib/photos.js';

/** Loads the ORIGINAL photos as object URLs for a set of slides. */
export function usePhotoUrls(slides) {
  const [urls, setUrls] = useState(null);
  useEffect(() => {
    if (!slides) return undefined;
    let alive = true;
    const made = [];
    (async () => {
      const m = {};
      for (const id of slidePhotoIds(slides)) {
        const p = await getPhoto(id);
        if (p) { const u = URL.createObjectURL(p.blob); made.push(u); m[id] = u; }
      }
      if (alive) setUrls(m);
    })();
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)); setUrls(null); };
  }, [slides]);
  return urls;
}

export function buildSlides(tab, rec) {
  return KINDS[tab].slides(cleanForExport(rec));
}

export default function PreviewModal({ job, onClose, onAction }) {
  const { tab, rec } = job;
  const K = KINDS[tab];
  const [slides] = useState(() => buildSlides(tab, rec));
  const urls = usePhotoUrls(slides);
  const bodyRef = useRef(null);
  const [k, setK] = useState(1);

  useLayoutEffect(() => {
    const fit = () => bodyRef.current && setK(Math.min(1, (bodyRef.current.clientWidth - 32) / W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="modal">
      <div className="mbar">
        <strong>{K.title(rec)}</strong>
        <button className="btn sm" onClick={() => onAction('pptx')}>Download PPTX</button>
        <button className="btn sm" onClick={() => onAction('pdf')}>Download PDF</button>
        <button className="btn sm" onClick={() => onAction('print')}>Print</button>
        <button className="btn sm" onClick={() => onAction('send')}>Send to me</button>
        <button className="btn sm dark" onClick={onClose}>Close</button>
      </div>
      <div className="mbody" ref={bodyRef}>
        {!urls && <p className="loading">Loading photos…</p>}
        {urls && slides.map((s, i) => (
          <div key={i} className="pv" style={{ width: W * k, height: H * k }}>
            <div className="slide-scale" style={{ transform: `scale(${k})` }}><SlideView slide={s} urls={urls} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
