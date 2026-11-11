import { KINDS } from '../lib/kinds.js';
import { usePhoto } from '../hooks/usePhoto.js';

function Thumb({ id }) {
  const { url } = usePhoto(id);
  return <div className="th">{url ? <img src={url} alt="" /> : 'No photo'}</div>;
}

export default function RecordList({ tab, items, memMode, onNew, onAct, onAll }) {
  const K = KINDS[tab];
  return (
    <>
      <div className="bar">
        <h2>{K.plural}</h2>
        {items.length > 0 && (
          <>
            <button className="btn" onClick={() => onAll('pptx')} title="All saved entries in one PowerPoint file">Download all ({items.length}) PPTX</button>
            <button className="btn" onClick={() => onAll('pdf')} title="All saved entries in one PDF file">Download all ({items.length}) PDF</button>
          </>
        )}
        <button className="btn primary" onClick={onNew}>+ {K.newLabel}</button>
      </div>
      {memMode && <div className="note">This browser blocked local storage, so your records and photos will disappear when you close the tab. Open the app in a normal (not private) window to keep them.</div>}
      {!items.length && (
        <div className="empty">
          <p>No {K.plural.toLowerCase()} yet. Fill in the form once and download the full report as PPTX or PDF.</p>
          <button className="btn primary" onClick={onNew}>+ {K.newLabel}</button>
        </div>
      )}
      {items.map((r) => {
        const st = (r.status || '').toLowerCase();
        const open = st !== 'closed' && st !== 'completed';
        return (
          <article className="rec" key={r.id}>
            <Thumb id={K.thumb(r)} />
            <div>
              <h3>{K.title(r)}</h3>
              <div className="meta">
                {K.meta(r).map((x) => <span key={x}>{x}</span>)}
                {r.status && <span className={'chip' + (open ? ' open' : '')}>{r.status}</span>}
              </div>
              <div className="acts">
                <button className="btn sm dark" onClick={() => onAct('edit', r)}>Edit</button>
                <button className="btn sm" onClick={() => onAct('preview', r)}>Preview</button>
                <button className="btn sm" onClick={() => onAct('pptx', r)}>Download PPTX</button>
                <button className="btn sm" onClick={() => onAct('pdf', r)}>Download PDF</button>
                <button className="btn sm" onClick={() => onAct('send', r)}>Send to me</button>
                <button className="btn sm ghost" onClick={() => onAct('dup', r)}>Duplicate</button>
                <button className="btn sm ghost danger" onClick={() => onAct('del', r)}>Delete</button>
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
