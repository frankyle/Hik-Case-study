import { useState } from 'react';
import { lines } from '../lib/helpers.js';

const BLANK = { name: '', company: '', position: '', qualification: '' };

export default function Participants({ rec, set, toast }) {
  const [bulk, setBulk] = useState('');
  const people = rec.participants || [];
  const upd = (i, k, v) => set({ participants: people.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });
  const addBulk = () => {
    const rows = lines(bulk).map((l) => {
      const [name, company, position, ...q] = l.split(',').map((s) => s.trim());
      return { name: name || '', company: company || '', position: position || '', qualification: q.join(', ') };
    });
    if (!rows.length) return;
    set({ participants: people.filter((p) => p.name || p.company || p.position || p.qualification).concat(rows) });
    setBulk('');
    toast(rows.length + ' added');
  };
  return (
    <div>
      <div className="pp hd"><span>Full name</span><span>Company</span><span>Position</span><span>Qualification</span><span /></div>
      {people.map((p, i) => (
        <div className="pp" key={i}>
          {['name', 'company', 'position', 'qualification'].map((k) => (
            <input key={k} value={p[k]} placeholder={{ name: 'Full name', company: 'Company', position: 'Position', qualification: 'Qualification' }[k]} aria-label={k} onChange={(e) => upd(i, k, e.target.value)} />
          ))}
          <button type="button" className="btn sm ghost danger" onClick={() => set({ participants: people.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <div className="acts" style={{ marginTop: 6 }}>
        <button type="button" className="btn sm" onClick={() => set({ participants: [...people, { ...BLANK }] })}>+ Add technician</button>
      </div>
      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Paste a list instead</summary>
        <label className="f" style={{ marginTop: 8 }}>One technician per line: name, company, position, qualification
          <textarea rows="4" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Juma Ally, Max Technologies, Technician, NACTE Certificate" />
        </label>
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={addBulk}>Add pasted technicians</button>
      </details>
      <label className="f" style={{ marginTop: 12, maxWidth: 340 }}>Number trained (only if you are not listing names)
        <input type="number" min="0" value={rec.count || ''} onChange={(e) => set({ count: e.target.value })} />
      </label>
    </div>
  );
}
