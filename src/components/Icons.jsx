const P = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};
const Svg = ({ children, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}>{children}</svg>
);
export const IcDownload = (p) => <Svg {...p}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></Svg>;
export const IcPlus = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IcEdit = (p) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const IcEye = (p) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const IcSend = (p) => <Svg {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></Svg>;
export const IcCopy = (p) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>;
export const IcTrash = (p) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const IcClose = (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IcBack = (p) => <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>;
export const IcChevron = (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const IcCheck = (p) => <Svg {...p}><path d="m5 12 5 5 9-10" /></Svg>;
export const IcFile = (p) => <Svg {...p}><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></Svg>;
export const IcLayers = (p) => <Svg {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Svg>;
export const IcCase = (p) => <Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3M3 13h18" /></Svg>;
export const IcCap = (p) => <Svg {...p}><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11.5V16c3 2.5 9 2.5 12 0v-4.5" /></Svg>;
export const IcMore = (p) => <Svg {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></Svg>;
export const IcCloud = (p) => <Svg {...p}><path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18z" /></Svg>;
