import { C } from '../lib/geometry.js';

const box = (p) => ({ left: p.x, top: p.y, width: p.w, height: p.h });
const runs = (t) => (Array.isArray(t) ? t.map((r, i) => <span key={i} style={{ color: '#' + (r.color || 'inherit') }}>{r.text}</span>) : t);

/** Draws one report page (fixed 1273 x 850 canvas). `urls` maps photo id -> full-resolution object URL. */
export default function SlideView({ slide, urls }) {
  return (
    <div className="slide">
      {slide.map((p, i) => {
        if (p.t === 'rect')
          return <div key={i} className="pr" style={{ ...box(p), background: '#' + p.fill, boxSizing: 'border-box', border: p.line ? `${p.lw}px solid #${p.line}` : undefined, borderRadius: p.round ? '50%' : p.r }} />;
        if (p.t === 'para') {
          const o = 0.25 * Math.min(p.w, p.h);
          return (
            <svg key={i} className="pr" style={box(p)} viewBox={`0 0 ${p.w} ${p.h}`} width={p.w} height={p.h}>
              <polygon fill={'#' + p.fill} points={`${o},0 ${p.w},0 ${p.w - o},${p.h} 0,${p.h}`} />
            </svg>
          );
        }
        if (p.t === 'text') {
          const jc = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[p.valign];
          return (
            <div key={i} className="tx" style={{ ...box(p), justifyContent: jc, fontSize: p.size, fontWeight: p.bold ? 700 : 400, fontStyle: p.italic ? 'italic' : 'normal', color: '#' + p.color, textAlign: p.align }}>
              <div>{runs(p.text)}</div>
            </div>
          );
        }
        if (p.t === 'img') {
          const url = p.photo && urls && urls[p.photo];
          return url
            ? <img key={i} className="pr" alt="" src={url} style={{ ...box(p), objectFit: p.fit === 'whole' ? 'contain' : 'cover' }} />
            : <div key={i} className="tx" style={{ ...box(p), background: '#EDEDED', justifyContent: 'center', textAlign: 'center', fontSize: 13, color: '#888' }}><div>No photo</div></div>;
        }
        if (p.t === 'tbl') {
          const tw = p.cols.reduce((a, b) => a + b, 0);
          return (
            <table key={i} style={{ left: p.x, top: p.y, width: tw, fontSize: p.size }}>
              <colgroup>{p.cols.map((c, j) => <col key={j} style={{ width: c }} />)}</colgroup>
              <tbody>
                {p.rows.map((r, ri) => (
                  <tr key={ri} style={{ height: p.rowH }}>
                    {r.map((c, ci) => <td key={ci} style={{ verticalAlign: p.valign, color: '#' + (c.color || C.ink), fontWeight: c.bold ? 700 : 400 }}>{c.text}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return null;
      })}
    </div>
  );
}
