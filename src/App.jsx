import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KINDS } from './lib/kinds.js';
import { openDB, dbAll, dbPut, dbDel, isMemMode } from './lib/db.js';
import { deletePhotos, clonePhoto, photoKeys, collectGarbage } from './lib/photos.js';
import { seedOnce } from './lib/seed.js';
import { makeBackup, restoreBackup } from './lib/backup.js';
import { makeFile, makeCombined, MIME } from './lib/exporter.js';
import { uid, seq, saveBlob, safeName, today } from './lib/helpers.js';
import { useIsMobile } from './hooks/useIsMobile.js';
import RecordList from './components/RecordList.jsx';
import RecordForm from './components/RecordForm.jsx';
import PreviewModal, { buildSlides, usePhotoUrls } from './components/PreviewModal.jsx';
import SlideView from './components/SlideView.jsx';
import MobileList from './components/MobileList.jsx';
import Sheet, { SheetRow } from './components/Sheet.jsx';
import { IcCase, IcCap, IcPlus, IcMore, IcDownload, IcEye, IcSend, IcEdit, IcCopy, IcTrash, IcLayers, IcCloud, IcFile } from './components/Icons.jsx';

const sortItems = (a) => a.sort((x, y) => (y.date || '').localeCompare(x.date || '') || (y.updated || 0) - (x.updated || 0));

let initP = null;
const initOnce = () =>
  initP || (initP = (async () => {
    await openDB();
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) { /* ignore */ }
    await seedOnce();
    const [cases, trainings] = await Promise.all([dbAll('cases'), dbAll('trainings')]);
    await collectGarbage([...cases, ...trainings]);
  })());

function PrintArea({ job, onDone }) {
  const [slides] = useState(() => buildSlides(job.tab, job.rec));
  const urls = usePhotoUrls(slides);
  useEffect(() => {
    if (!urls) return undefined;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); onDone(); };
    window.addEventListener('afterprint', done, { once: true });
    const t = setTimeout(() => window.print(), 400);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); document.body.classList.remove('printing'); };
  }, [urls]); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(<div id="printArea">{urls && slides.map((s, i) => <SlideView key={i} slide={s} urls={urls} />)}</div>, document.body);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('cases');
  const [mode, setMode] = useState('list');
  const [items, setItems] = useState({ cases: [], trainings: [] });
  const [rec, setRec] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [preview, setPreview] = useState(null);
  const [printJob, setPrintJob] = useState(null);
  const [sheet, setSheet] = useState(null);   // phone bottom sheet: {type:'rec'|'form'|'more', ...}
  const mobile = useIsMobile();
  const busyRef = useRef(false);
  const [mail, setMail] = useState(() => { try { return localStorage.getItem('hik_mail') || ''; } catch (_) { return ''; } });
  const pending = useRef({ added: new Set(), removed: new Set() });
  const toastT = useRef(null);

  const toast = useCallback((msg, ms = 2600) => {
    clearTimeout(toastT.current);
    setToastMsg(msg);
    if (msg && ms) toastT.current = setTimeout(() => setToastMsg(''), ms);
  }, []);

  const loadAll = useCallback(async () => {
    const [cases, trainings] = await Promise.all([dbAll('cases'), dbAll('trainings')]);
    setItems({ cases: sortItems(cases), trainings: sortItems(trainings) });
  }, []);

  useEffect(() => { initOnce().then(loadAll).then(() => setReady(true)); }, [loadAll]);

  // warn before closing the tab with unsaved edits
  useEffect(() => {
    const h = (e) => { if (mode === 'form' && dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [mode, dirty]);

  const setRecDirty = useCallback((fn) => { setRec(fn); setDirty(true); }, []);

  /* ---------- form lifecycle ---------- */
  const resetPending = () => { pending.current = { added: new Set(), removed: new Set() }; };
  const discardEdits = async () => {
    await deletePhotos([...pending.current.added]); // photos picked in this session but never saved
    resetPending();
  };
  const persist = async () => {
    const saved = { ...rec, updated: Date.now() };
    await dbPut(tab, saved);
    const keep = new Set(photoKeys(saved));
    await deletePhotos([...pending.current.removed].filter((id) => !keep.has(id)));
    resetPending();
    setRec(saved); setIsNew(false); setDirty(false);
    await loadAll();
    return saved;
  };
  const leaveForm = async () => {
    if (dirty && !confirm('Leave without saving your changes?')) return false;
    if (dirty) await discardEdits(); else resetPending();
    return true;
  };

  const switchTab = async (k) => {
    if (k === tab && mode === 'list') return;
    if (mode === 'form' && !(await leaveForm())) return;
    setTab(k); setMode('list'); setDirty(false); window.scrollTo(0, 0);
  };

  /* ---------- exports ---------- */
  const download = async (kind, r, fmt) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const name = KINDS[kind].file(r);
    toast(`Building ${fmt.toUpperCase()}…`, 0);
    try {
      saveBlob(await makeFile(kind, r, fmt), `${name}.${fmt}`);
      toast(`Downloaded ${name}.${fmt}`);
    } catch (e) { console.error(e); toast(e.message || 'Export failed', 5000); }
    finally { busyRef.current = false; }
  };
  /** Every saved entry of this tab in ONE pptx / pdf (newest first, as listed). */
  const downloadAll = async (kind, fmt, list) => {
    if (busyRef.current) return;
    const recs = list || items[kind];
    if (!recs.length) { toast('Nothing saved yet'); return; }
    busyRef.current = true;
    const name = `Hikvision_${safeName(KINDS[kind].plural)}_all_${today()}.${fmt}`;
    toast(`Building ${fmt.toUpperCase()}…`, 0);
    try {
      const blob = await makeCombined(kind, recs, fmt, (i, n) => toast(`Building ${fmt.toUpperCase()}: ${i} of ${n} entries…`, 0));
      saveBlob(blob, name);
      toast(`Downloaded ${name} (${recs.length} entries)`, 4500);
    } catch (e) { console.error(e); toast(e.message || 'Export failed', 5000); }
    finally { busyRef.current = false; }
  };
  const send = async (kind, r) => {
    const K = KINDS[kind], name = K.file(r) + '.pptx';
    toast('Preparing PPTX…', 0);
    try {
      const blob = await makeFile(kind, r, 'pptx');
      const file = new File([blob], name, { type: MIME.pptx });
      const subject = `${K.label}: ${K.title(r)}`, text = `${K.label} report from Frank Magai: ${K.title(r)}`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: subject, text }); toast('Shared'); return; }
        catch (e) { if (e && e.name === 'AbortError') { toast('Cancelled'); return; } }
      }
      saveBlob(blob, name);
      toast(`Downloaded ${name}. Attach it to the email that opens now.`, 6000);
      setTimeout(() => { location.href = `mailto:${encodeURIComponent(mail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n(Attach the downloaded file: ' + name + ')')}`; }, 900);
    } catch (e) { console.error(e); toast(e.message || 'Could not prepare the file', 5000); }
  };

  /* ---------- actions from the list ---------- */
  const onListAct = async (act, r) => {
    if (act === 'edit') { resetPending(); setRec(structuredClone(r)); setIsNew(false); setDirty(false); setMode('form'); window.scrollTo(0, 0); }
    else if (act === 'preview') setPreview({ tab, rec: r });
    else if (act === 'pptx' || act === 'pdf') download(tab, r, act);
    else if (act === 'send') send(tab, r);
    else if (act === 'dup') {
      const c = structuredClone(r);
      c.id = uid(); c.updated = Date.now();
      for (const k of Object.keys(c)) if (k.startsWith('photo_') && c[k]) c[k] = await clonePhoto(c[k]);
      if (c.caseId) c.caseId = seq(items.cases, 'TS', c.date);
      if (c.sessionId) c.sessionId = seq(items.trainings, 'TR', c.date);
      await dbPut(tab, c); await loadAll(); toast('Duplicated');
    } else if (act === 'del') {
      if (!confirm('Delete this record and its photos from this device?')) return;
      await dbDel(tab, r.id); await deletePhotos(photoKeys(r)); await loadAll(); toast('Deleted');
    }
  };
  const newRecord = () => { resetPending(); setRec(KINDS[tab].blank(items[tab])); setIsNew(true); setDirty(false); setMode('form'); window.scrollTo(0, 0); };

  /* ---------- actions from the form dock ---------- */
  const onFormAct = async (act) => {
    const saved = await persist();
    if (act === 'preview') setPreview({ tab, rec: saved });
    else if (act === 'send') send(tab, saved);
    else download(tab, saved, act);
  };
  // Save first so the combined file includes the entry being edited, then build it from the database.
  const onFormAll = async (fmt) => {
    await persist();
    const list = sortItems(await dbAll(tab));
    downloadAll(tab, fmt, list);
  };

  /* ---------- preview modal actions ---------- */
  const onPreviewAct = async (act) => {
    const { tab: t, rec: r } = preview;
    if (act === 'print') { setPreview(null); setPrintJob({ tab: t, rec: r }); }
    else if (act === 'send') send(t, r);
    else download(t, r, act);
  };

  /* ---------- backup / restore ---------- */
  const backup = async () => {
    toast('Preparing backup…', 0);
    try { const { blob, name } = await makeBackup(); saveBlob(blob, name); toast('Backup downloaded (records + original photos)'); }
    catch (e) { console.error(e); toast('Backup failed', 4000); }
  };
  const restore = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    toast('Restoring…', 0);
    try { const n = await restoreBackup(await f.text()); await loadAll(); toast(`Restored ${n} records`); }
    catch (err) { console.error(err); toast('That file is not a valid backup', 4000); }
  };

  if (!ready) return <div className="boot">Loading…</div>;

  const K = KINDS[tab];
  const closeSheet = () => setSheet(null);
  const sheetRec = sheet && sheet.type === 'rec' ? sheet.rec : null;
  const act = (fn) => () => { closeSheet(); fn(); };

  if (mobile) {
    return (
      <div className={'m-app' + (mode === 'form' ? ' in-form' : '')}>
        {mode === 'list' && (
          <>
            <header className="m-hero">
              <div className="m-hero-top">
                <span className="m-brand">HIKVISION</span>
                <button className="m-round dark" onClick={() => setSheet({ type: 'more' })} aria-label="Settings and backup"><IcMore size={22} /></button>
              </div>
              <h1>Field Reports</h1>
              <p>{items[tab].length} saved {items[tab].length === 1 ? K.label.toLowerCase() : K.plural.toLowerCase()}</p>
              <div className="m-seg" role="tablist">
                {Object.entries(KINDS).map(([k, v]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}>
                    {k === 'cases' ? <IcCase size={18} /> : <IcCap size={18} />} {k === 'cases' ? 'Support' : 'Training'}
                  </button>
                ))}
              </div>
            </header>
            <main className="m-main">
              <MobileList tab={tab} items={items[tab]} memMode={isMemMode()} onNew={newRecord} onAct={onListAct}
                onAll={(fmt) => downloadAll(tab, fmt)} onOpenSheet={(r) => setSheet({ type: 'rec', rec: r })} />
            </main>
            <nav className="m-nav" aria-label="Main">
              <button aria-current={tab === 'cases'} onClick={() => switchTab('cases')}><IcCase size={22} /><span>Support</span></button>
              <button aria-current={tab === 'trainings'} onClick={() => switchTab('trainings')}><IcCap size={22} /><span>Training</span></button>
              <button className="m-fab" onClick={newRecord} aria-label={K.newLabel}><IcPlus size={28} /></button>
              <button onClick={() => items[tab].length ? setSheet({ type: 'all' }) : toast('Nothing saved yet')}><IcLayers size={22} /><span>Export all</span></button>
              <button onClick={() => setSheet({ type: 'more' })}><IcMore size={22} /><span>More</span></button>
            </nav>
          </>
        )}
        {mode === 'form' && (
          <main className="m-main m-formmain">
            <RecordForm mobile tab={tab} rec={rec} setRec={setRecDirty} isNew={isNew} pending={pending} toast={toast}
              onBack={async () => { if (await leaveForm()) { setMode('list'); setDirty(false); } }}
              onSave={async () => { await persist(); toast('Saved on this device'); }} onAct={onFormAct} onAll={onFormAll}
              onMenu={() => setSheet({ type: 'form' })} />
          </main>
        )}

        {sheetRec && (
          <Sheet title={K.title(sheetRec)} subtitle={K.meta(sheetRec).join('  ·  ')} onClose={closeSheet}>
            <p className="m-sh-lab">Download this report</p>
            <SheetRow tone="primary" icon={<IcDownload />} label="PowerPoint (.pptx)" sub="Opens in PowerPoint, Keynote, Google Slides" onClick={act(() => download(tab, sheetRec, 'pptx'))} />
            <SheetRow tone="primary" icon={<IcDownload />} label="PDF (.pdf)" sub="Best for WhatsApp and email" onClick={act(() => download(tab, sheetRec, 'pdf'))} />
            <p className="m-sh-lab">More</p>
            <SheetRow icon={<IcEye />} label="Preview" onClick={act(() => setPreview({ tab, rec: sheetRec }))} />
            <SheetRow icon={<IcSend />} label="Send to me" sub="Share sheet or email" onClick={act(() => send(tab, sheetRec))} />
            <SheetRow icon={<IcEdit />} label="Edit" onClick={act(() => onListAct('edit', sheetRec))} />
            <SheetRow icon={<IcCopy />} label="Duplicate" onClick={act(() => onListAct('dup', sheetRec))} />
            <SheetRow tone="danger" icon={<IcTrash />} label="Delete" onClick={act(() => onListAct('del', sheetRec))} />
          </Sheet>
        )}
        {sheet && sheet.type === 'form' && (
          <Sheet title="Save & download" subtitle="Your entry is saved first, then the file is built." onClose={closeSheet}>
            <p className="m-sh-lab">This report</p>
            <SheetRow tone="primary" icon={<IcDownload />} label="PowerPoint (.pptx)" onClick={act(() => onFormAct('pptx'))} />
            <SheetRow tone="primary" icon={<IcDownload />} label="PDF (.pdf)" onClick={act(() => onFormAct('pdf'))} />
            <p className="m-sh-lab">All saved entries in one file</p>
            <SheetRow icon={<IcLayers />} label="All entries, PowerPoint" sub={`${items[tab].length + (isNew ? 1 : 0)} ${K.plural.toLowerCase()} combined`} onClick={act(() => onFormAll('pptx'))} />
            <SheetRow icon={<IcLayers />} label="All entries, PDF" onClick={act(() => onFormAll('pdf'))} />
            <p className="m-sh-lab">More</p>
            <SheetRow icon={<IcEye />} label="Preview report" onClick={act(() => onFormAct('preview'))} />
            <SheetRow icon={<IcSend />} label="Send to me" onClick={act(() => onFormAct('send'))} />
          </Sheet>
        )}
        {sheet && sheet.type === 'all' && (
          <Sheet title={`All ${items[tab].length} ${K.plural.toLowerCase()}`} subtitle="Every saved entry combined into one file." onClose={closeSheet}>
            <SheetRow tone="primary" icon={<IcLayers />} label="One PowerPoint (.pptx)" sub="All entries, one slide set" onClick={act(() => downloadAll(tab, 'pptx'))} />
            <SheetRow tone="primary" icon={<IcLayers />} label="One PDF (.pdf)" sub="All entries, one document" onClick={act(() => downloadAll(tab, 'pdf'))} />
          </Sheet>
        )}
        {sheet && sheet.type === 'more' && (
          <Sheet title="Settings & backup" onClose={closeSheet}>
            <label className="m-field">Send reports to
              <input type="email" value={mail} placeholder="your email address" autoComplete="email" inputMode="email"
                onChange={(e) => { setMail(e.target.value); try { localStorage.setItem('hik_mail', e.target.value.trim()); } catch (_) { /* ignore */ } }} />
            </label>
            <SheetRow icon={<IcCloud />} label="Back up data" sub="One file with records and original photos" onClick={act(backup)} />
            <label className="m-row">
              <span className="m-row-ic"><IcFile /></span>
              <span className="m-row-t"><b>Restore from backup</b><small>Choose a backup .json file</small></span>
              <input type="file" accept=".json,application/json" hidden onChange={(e) => { closeSheet(); restore(e); }} />
            </label>
          </Sheet>
        )}

        {preview && <PreviewModal job={preview} onClose={() => setPreview(null)} onAction={onPreviewAct} onAll={(f) => downloadAll(preview.tab, f)} />}
        {toastMsg && <div className="toast m-toast">{toastMsg}</div>}
      </div>
    );
  }

  return (
    <>
      <header className="top">
        <span className="brand">HIKVISION</span>
        <h1>Field Reports</h1>
        <label className="mail">Send reports to
          <input type="email" value={mail} placeholder="your email address" autoComplete="email"
            onChange={(e) => { setMail(e.target.value); try { localStorage.setItem('hik_mail', e.target.value.trim()); } catch (_) { /* ignore */ } }} />
        </label>
        <button className="btn sm" onClick={backup}>Back up data</button>
        <label className="btn sm">Restore<input type="file" accept=".json,application/json" hidden onChange={restore} /></label>
      </header>
      <nav className="tabs" role="tablist">
        {Object.entries(KINDS).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}>{v.plural}</button>
        ))}
      </nav>
      <main>
        {mode === 'list'
          ? <RecordList tab={tab} items={items[tab]} memMode={isMemMode()} onNew={newRecord} onAct={onListAct} onAll={(fmt) => downloadAll(tab, fmt)} />
          : <RecordForm tab={tab} rec={rec} setRec={setRecDirty} isNew={isNew} pending={pending} toast={toast}
              onBack={async () => { if (await leaveForm()) { setMode('list'); setDirty(false); } }}
              onSave={async () => { await persist(); toast('Saved on this device'); }} onAct={onFormAct} onAll={onFormAll} />}
      </main>
      {preview && <PreviewModal job={preview} onClose={() => setPreview(null)} onAction={onPreviewAct} onAll={(f) => downloadAll(preview.tab, f)} />}
      {printJob && <PrintArea job={printJob} onDone={() => setPrintJob(null)} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
