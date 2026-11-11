import { useEffect } from 'react';
import { IcClose } from './Icons.jsx';

/** Bottom sheet for phones. `children` is the content; tapping the dim background or pressing Esc closes it. */
export default function Sheet({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="m-sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="m-scrim" onClick={onClose} />
      <div className="m-sheet">
        <div className="m-grab" />
        <div className="m-sheet-h">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button className="m-x" onClick={onClose} aria-label="Close"><IcClose size={20} /></button>
        </div>
        <div className="m-sheet-b">{children}</div>
      </div>
    </div>
  );
}

/** One big tappable row inside a Sheet. tone: 'primary' | 'danger' | undefined */
export function SheetRow({ icon, label, sub, tone, onClick, children }) {
  return (
    <button type="button" className={'m-row' + (tone ? ' ' + tone : '')} onClick={onClick}>
      <span className="m-row-ic">{icon}</span>
      <span className="m-row-t"><b>{label}</b>{sub && <small>{sub}</small>}</span>
      {children}
    </button>
  );
}
