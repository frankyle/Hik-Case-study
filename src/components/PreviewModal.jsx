import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SlideView from './SlideView.jsx';
import { W, H } from '../lib/geometry.js';
import { KINDS, cleanForExport } from '../lib/kinds.js';
import { slidePhotoIds } from '../lib/geometry.js';
import { getPhoto } from '../lib/photos.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { IcClose, IcDownload, IcSend } from './Icons.jsx';

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

export default function PreviewModal({ job, onClose, onAction, onAll }) {
  const mobile = useIsMobile();
  const { tab, rec } = job;
  const K = KINDS[tab];
  const [slides] = useState(() => buildSlides(tab, rec));
  const urls = usePhotoUrls(slides);
  const bodyRef = useRef(null);
  const [k0, setK] = useState(1);
  const [zoom, setZoom] = useState(false);
  const k = mobile && zoom ? Math.min(1, k0 * 2.6) : k0;

  useLayoutEffect(() => {
    const fit = () => bodyRef.current && setK(Math.min(1, (bodyRef.current.clientWidth - (mobile ? 20 : 32)) / W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [mobile]);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const body = (
    <div className={'mbody' + (mobile && zoom ? ' zoomed' : '')} ref={bodyRef}>
      {!urls && <p className="loading">Loading photos…</p>}
      {urls && slides.map((s, i) => (
        <div key={i} className="pv" style={{ width: W * k, height: H * k }} onClick={mobile ? () => setZoom((z) => !z) : undefined}>
          <div className="slide-scale" style={{ transform: `scale(${k})` }}><SlideView slide={s} urls={urls} /></div>
        </div>
      ))}
    </div>
  );

  if (mobile) {
    return (
      <div className="modal m-modal">
        <div className="m-pv-top">
          <div style={{ flex: 1, minWidth: 0 }}><small>{K.label}</small><strong>{K.title(rec)}</strong></div>
          <button className="m-zoom" onClick={() => setZoom((z) => !z)}>{zoom ? 'Fit page' : 'Zoom in'}</button>
          <button className="m-x light" onClick={onClose} aria-label="Close preview"><IcClose size={22} /></button>
        </div>
        {body}
        <div className="m-pv-bar">
          <button className="m-btn primary" onClick={() => onAction('pptx')}><IcDownload size={18} /> PPTX</button>
          <button className="m-btn primary" onClick={() => onAction('pdf')}><IcDownload size={18} /> PDF</button>
          <button className="m-btn soft" onClick={() => onAction('send')}><IcSend size={18} /> Send</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal">
      <div className="mbar">
        <strong>{K.title(rec)}</strong>
        <button className="btn sm" onClick={() => onAction('pptx')}>Download PPTX</button>
        <button className="btn sm" onClick={() => onAction('pdf')}>Download PDF</button>
        {onAll && <button className="btn sm" onClick={() => onAll('pptx')}>All entries PPTX</button>}
        {onAll && <button className="btn sm" onClick={() => onAll('pdf')}>All entries PDF</button>}
        <button className="btn sm" onClick={() => onAction('print')}>Print</button>
        <button className="btn sm" onClick={() => onAction('send')}>Send to me</button>
        <button className="btn sm dark" onClick={onClose}>Close</button>
      </div>
      {body}
    </div>
  );
}
