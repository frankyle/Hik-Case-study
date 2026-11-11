import { KINDS } from '../lib/kinds.js';
import { usePhoto } from '../hooks/usePhoto.js';
import { IcDownload, IcEdit, IcPlus, IcLayers, IcFile } from './Icons.jsx';

function Cover({ id, kind }) {
  const { url } = usePhoto(id);
  return (
    <div className="m-cover">
      {url ? <img src={url} alt="" /> : <div className="m-cover-empty"><IcFile size={30} /><span>No photo</span></div>}
      <span className="m-kind">{kind}</span>
    </div>
  );
}

/** Phone layout of the list: big cover cards, an "everything in one file" banner, one tap to download. */
export default function MobileList({ tab, items, memMode, onNew, onAct, onAll, onOpenSheet }) {
  const K = KINDS[tab];
  return (
    <div className="m-list">
      {memMode && <div className="note">This browser blocked local storage, so records will disappear when you close the tab. Use a normal (not private) window.</div>}

      {items.length > 0 && (
        <section className="m-all">
          <div className="m-all-t">
            <span className="m-all-ic"><IcLayers size={22} /></span>
            <div><b>All {items.length} {items.length === 1 ? K.label.toLowerCase() : K.plural.toLowerCase()}</b><small>in one combined file</small></div>
          </div>
          <div className="m-all-b">
            <button onClick={() => onAll('pptx')}><IcDownload size={18} /> PPTX</button>
            <button onClick={() => onAll('pdf')}><IcDownload size={18} /> PDF</button>
          </div>
        </section>
      )}

      {!items.length && (
        <div className="m-empty">
          <div className="m-empty-ic"><IcFile size={34} /></div>
          <h3>No {K.plural.toLowerCase()} yet</h3>
          <p>Fill in the form once. Then download it as PPTX or PDF, one by one or all together.</p>
          <button className="m-btn primary" onClick={onNew}><IcPlus size={20} /> {K.newLabel}</button>
        </div>
      )}

      {items.map((r) => {
        const st = (r.status || '').toLowerCase();
        const open = st !== 'closed' && st !== 'completed';
        return (
          <article className="m-card" key={r.id}>
            <button className="m-card-hit" onClick={() => onAct('preview', r)} aria-label={'Preview ' + K.title(r)}>
              <Cover id={K.thumb(r)} kind={K.label} />
            </button>
            <div className="m-card-b">
              <div className="m-card-top">
                <h3>{K.title(r)}</h3>
                {r.status && <span className={'m-st' + (open ? ' open' : '')}>{r.status}</span>}
              </div>
              <p className="m-meta">{K.meta(r).join('  ·  ')}</p>
              <div className="m-card-a">
                <button className="m-btn soft" onClick={() => onAct('edit', r)}><IcEdit size={18} /> Edit</button>
                <button className="m-btn primary" onClick={() => onOpenSheet(r)}><IcDownload size={18} /> Download</button>
              </div>
            </div>
          </article>
        );
      })}
      <div className="m-spacer" />
    </div>
  );
}
