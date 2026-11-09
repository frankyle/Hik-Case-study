import { useEffect, useState } from 'react';
import { getPhoto } from '../lib/photos.js';

/** Object URL (+ info) for a stored photo. `full` = the original file, otherwise the small thumbnail. */
export function usePhoto(id, full = false) {
  const [s, setS] = useState({ url: null, info: null });
  useEffect(() => {
    if (!id) { setS({ url: null, info: null }); return undefined; }
    let alive = true, url = null;
    getPhoto(id).then((p) => {
      if (!alive || !p) return;
      url = URL.createObjectURL(full ? p.blob : (p.thumb || p.blob));
      setS({ url, info: { width: p.width, height: p.height, size: p.size, type: p.type, converted: p.converted, name: p.name } });
    });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [id, full]);
  return s;
}
