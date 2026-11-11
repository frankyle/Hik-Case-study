import { useEffect, useState } from 'react';

const Q = '(max-width: 760px)';
const get = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia(Q).matches;

/** true on phone-sized screens; the app switches to its own mobile layout. */
export function useIsMobile() {
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(Q);
    const h = () => setM(mq.matches);
    h();
    mq.addEventListener ? mq.addEventListener('change', h) : mq.addListener(h);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', h) : mq.removeListener(h));
  }, []);
  return m;
}
