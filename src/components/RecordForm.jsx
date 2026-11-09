import { useRef, useState } from 'react';
import { KINDS, PROGRAMS } from '../lib/kinds.js';
import { CASE_SLOTS, slotCount, slotType } from '../lib/geometry.js';
import { ingestPhoto } from '../lib/photos.js';
import PhotoSlot from './PhotoSlot.jsx';
import Participants from './Participants.jsx';

/** Toggle a ready-made phrase on/off as one line of the text; whatever else was typed stays. */
function toggleLine(text, phrase) {
  const ls = String(text || '').split('\n');
  if (ls.some((l) => l.trim() === phrase)) return ls.filter((l) => l.trim() !== phrase).join('\n');
  while (ls.length && !ls[ls.length - 1].trim()) ls.pop();
  return [...ls, phrase].join('\n');
}

function Field({ f, rec, onChange }) {
  const id = 'f_' + f.k;
  const v = rec[f.k] || '';
  if (f.chips) {
    const have = new Set(v.split('\n').map((l) => l.trim()));
    return (
      <div className={'f' + (f.wide ? ' wide' : '')}>
        <label htmlFor={id}>{f.l}</label>
        <div className="chips" role="group" aria-label={f.l + ' options'}>
          {f.chips.map((c) => (
            <button key={c} type="button" className={'chip' + (have.has(c) ? ' on' : '')} aria-pressed={have.has(c)}
              onClick={() => onChange(f.k, toggleLine(v, c))}>{have.has(c) ? '✓ ' : '+ '}{c}</button>
          ))}
        </div>
        <textarea id={id} rows="4" value={v} onChange={(e) => onChange(f.k, e.target.value)} />
        {f.hint && <span className="hint">{f.hint}</span>}
      </div>
    );
  }
  return (
    <label className={'f' + (f.wide ? ' wide' : '')} htmlFor={id}>
      {f.l}
      {f.type === 'area'
        ? <textarea id={id} rows="3" value={v} onChange={(e) => onChange(f.k, e.target.value)} />
        : <input id={id} type={f.type || 'text'} value={v} placeholder={f.ph} list={f.list ? 'dl_' + f.k : undefined} autoComplete="off" onChange={(e) => onChange(f.k, e.target.value)} />}
      {f.list && <datalist id={'dl_' + f.k}>{f.list.map((o) => <option key={o} value={o} />)}</datalist>}
      {f.hint && <span className="hint">{f.hint}</span>}
    </label>
  );
}

/**
 * Photos are written to IndexedDB the moment they are picked (original file, untouched).
 * `pending` remembers which photos this editing session added/removed so Save / Discard can tidy up.
 */
export default function RecordForm({ tab, rec, setRec, isNew, pending, onBack, onSave, onAct, toast }) {
  const K = KINDS[tab];
  const [busy, setBusy] = useState({});
  const recRef = useRef(rec);
  recRef.current = rec;

  const change = (k, v) => {
    setRec((r) => {
      const n = { ...r, [k]: v };
      if (k === 'program' && PROGRAMS[v] && !(r.topics || '').trim()) n.topics = PROGRAMS[v].join('\n');
      return n;
    });
  };
  const patch = (p) => setRec((r) => ({ ...r, ...p }));

  const pick = async (slotKey, file) => {
    setBusy((b) => ({ ...b, [slotKey]: true }));
    try {
      const ph = await ingestPhoto(file);
      const old = recRef.current['photo_' + slotKey];
      pending.current.added.add(ph.id);
      if (old) pending.current.removed.add(old);
      patch({ ['photo_' + slotKey]: ph.id });
    } catch (e) {
      console.error(e);
      toast('That photo could not be read. Try a JPG or PNG.', 4500);
    } finally {
      setBusy((b) => ({ ...b, [slotKey]: false }));
    }
  };
  const remove = (slotKey) => {
    const old = rec['photo_' + slotKey];
    if (old) pending.current.removed.add(old);
    setRec((r) => { const n = { ...r }; delete n['photo_' + slotKey]; delete n['fit_' + slotKey]; return n; });
  };

  return (
    <>
      <div className="bar">
        <button className="btn sm" onClick={onBack}>&larr; Back to list</button>
        <h2>{isNew ? K.newLabel : 'Edit ' + K.label.toLowerCase()}</h2>
      </div>
      {K.sections.map((s, i) => (
        <fieldset key={s.title}>
          <legend><div className="fh"><b>{i + 1}</b><span>{s.title}</span></div></legend>
          {s.fields && <div className="grid">{s.fields.map((f) => <Field key={f.k} f={f} rec={rec} onChange={change} />)}</div>}
          {s.photos && (
            <div className="photos">
              {s.photos.map((p) => (
                <PhotoSlot key={p.k} slot={p} busy={busy[p.k]} photoId={rec['photo_' + p.k]} fit={rec['fit_' + p.k] || 'fill'}
                  onPick={(f) => pick(p.k, f)} onRemove={() => remove(p.k)} onFit={(v) => change('fit_' + p.k, v)} />
              ))}
            </div>
          )}
          {s.photoTypes && (
            <>
              <p className="hint">Choose what each picture shows. Only slots with a photo are placed on the slide, and the layout adjusts to 1, 2, 3 or 4 photos.</p>
              <div className="photos">
                {CASE_SLOTS.slice(0, slotCount(rec)).map((k, i) => (
                  <PhotoSlot key={k} slot={{ k, l: 'Photo ' + (i + 1), ratio: '188/236', typed: true }} busy={busy[k]}
                    photoId={rec['photo_' + k]} fit={rec['fit_' + k] || 'fill'}
                    type={slotType(rec, k)} label={rec['label_' + k] || ''}
                    onType={(v) => change('type_' + k, v)} onLabel={(v) => change('label_' + k, v)}
                    onPick={(f) => pick(k, f)} onRemove={() => remove(k)} onFit={(v) => change('fit_' + k, v)}
                    onDropSlot={k === 'extra' ? () => { remove(k); patch({ photoCount: 3 }); } : undefined} />
                ))}
              </div>
              {slotCount(rec) < 4 && <button type="button" className="btn sm" style={{ marginTop: 12 }} onClick={() => patch({ photoCount: 4 })}>+ Add a 4th photo</button>}
            </>
          )}
          {s.people && <Participants rec={rec} set={patch} toast={toast} />}
        </fieldset>
      ))}
      <div className="dock">
        <button className="btn primary" onClick={onSave}>Save</button>
        <button className="btn" onClick={() => onAct('preview')}>Preview report</button>
        <button className="btn" onClick={() => onAct('pptx')}>Download PPTX</button>
        <button className="btn" onClick={() => onAct('pdf')}>Download PDF</button>
        <button className="btn" onClick={() => onAct('send')}>Send to me</button>
      </div>
    </>
  );
}

