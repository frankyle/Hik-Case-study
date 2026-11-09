import { usePhoto } from '../hooks/usePhoto.js';
import { fmtBytes } from '../lib/helpers.js';
import { PHOTO_TYPES, OTHER_TYPE } from '../lib/geometry.js';

/** `slot.typed` = the engineer chooses what kind of picture this is (type / custom label). */
export default function PhotoSlot({ slot, photoId, fit = 'fill', onPick, onRemove, onFit, busy, type, label, onType, onLabel, onDropSlot }) {
  const { url, info } = usePhoto(photoId);
  const [rw, rh] = slot.ratio.split('/').map(Number);
  return (
    <div className="slot">
      {slot.typed ? (
        <div className="slot-h typed">
          <select value={type} onChange={(e) => onType(e.target.value)} aria-label={slot.l + ' type'}>
            {PHOTO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value={OTHER_TYPE}>{OTHER_TYPE}</option>
          </select>
          {type === OTHER_TYPE && <input type="text" value={label} placeholder="e.g. Cable routing" maxLength={60} onChange={(e) => onLabel(e.target.value)} />}
        </div>
      ) : <div className="slot-h">{slot.l}</div>}
      <div className="slot-img" style={{ aspectRatio: slot.ratio, maxWidth: rh > rw ? 210 : undefined }}>
        {url ? <img src={url} alt="" style={{ objectFit: fit === 'whole' ? 'contain' : 'cover' }} /> : <span>{busy ? 'Saving photo…' : 'No photo yet'}</span>}
      </div>
      {info && (
        <div className="photo-info">
          {info.width}×{info.height} · {fmtBytes(info.size)} · {info.converted ? 'full size, rotated upright / converted to JPEG' : 'original file, untouched'}
        </div>
      )}
      <div className="slot-b">
        <label className="btn sm">
          {photoId ? 'Replace photo' : 'Take or choose photo'}
          <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onPick(f); }} />
        </label>
        {photoId && (
          <>
            <button type="button" className="btn sm ghost danger" onClick={onRemove}>Remove</button>
            <select value={fit} onChange={(e) => onFit(e.target.value)} aria-label="Photo fit">
              <option value="fill">Fill frame</option>
              <option value="whole">Show whole photo</option>
            </select>
          </>
        )}
        {onDropSlot && <button type="button" className="btn sm ghost danger" onClick={onDropSlot}>Remove this slot</button>}
      </div>
    </div>
  );
}
