import { caseSlides, trainingSlides, trainCount, DEFAULT_TYPE } from './geometry.js';
import { uid, today, fmtDate, safeName, seq } from './helpers.js';

export const PROGRAMS = {
  'CCTV Camera & Audio Systems': ['Hik-ProConnect', 'Turbo HD / IP camera lineup', 'Audio & alarm accessories'],
  'Access Control & Video Intercom': ['Access control controllers', 'Video intercom', 'Hik-Connect'],
  'Gate Motor, Energizer & AX Pro': ['Gate motor installation', 'Electric fence energizers', 'AX Pro alarm panel'],
  'Networking Fundamentals': ['OSI model', 'VLANs & IP addressing', 'Switch types & PoE'],
  'Fire Alarm Systems': ['Detectors & call points', 'Control panels', 'Zoning & wiring practice'],
};

export const SOLUTION_OPTIONS = [
  'Firmware upgraded to the latest version', 'Password reset and account secured', 'System configuration and parameter settings corrected',
  'Device re-configured and optimised', 'Factory reset and device re-activation', 'Faulty component replaced', 'Power supply / transformer replaced',
  'Cabling and connections re-terminated', 'Network settings configured (IP, ports, DDNS)', 'Device added to Hik-Connect / Hik-ProConnect',
  'Remote access and mobile app set up', 'User training provided',
];
export const SPECIALIZATIONS = [
  'CCTV Installation', 'Motorgate Installation', 'Electric Fence Installation', 'Access Control', 'Fire Alarm Systems',
  'Beginner Installer', 'Networking Engineer', 'Physical Security Systems Installation',
];

// Photo fields on a record are stored as  photo_<slot> = <photo id in IndexedDB>  and  fit_<slot> = 'fill' | 'whole'.
export const KINDS = {
  cases: {
    label: 'Support case', plural: 'Support cases', newLabel: 'New support case',
    blank: (list) => ({
      id: uid(), techName: '', techCompany: '', techPosition: 'Technician', techExp: '', techSpec: '', techTeam: '',
      siteName: '', siteType: 'Residence House', siteLocation: '', endUser: '',
      supportType: 'On-site Technical Support', products: '', issue: '', solution: '', outcome: '',
      date: today(), caseId: seq(list, 'TS'), engineer: 'Frank Magai', supportLocation: '', timeSpent: '', status: 'Closed',
      photoCount: 3, type_products: DEFAULT_TYPE.products, type_site: DEFAULT_TYPE.site, type_engineer: DEFAULT_TYPE.engineer, type_extra: DEFAULT_TYPE.extra,
    }),
    title: (r) => r.siteName || 'Untitled case',
    meta: (r) => [r.caseId, fmtDate(r.date), r.techCompany].filter(Boolean),
    thumb: (r) => r.photo_engineer || r.photo_site || r.photo_products || r.photo_extra,
    slides: caseSlides,
    file: (r) => `${safeName(r.caseId)}_${safeName(r.siteName)}`,
    sections: [
      { title: 'Technician information', fields: [
        { k: 'techName', l: 'Technician name' }, { k: 'techCompany', l: 'Company' }, { k: 'techPosition', l: 'Position' },
        { k: 'techExp', l: 'Experience', ph: 'e.g. 4 Years' }, { k: 'techSpec', l: 'Specialization', list: SPECIALIZATIONS }, { k: 'techTeam', l: 'Team size', ph: 'e.g. 3 Technicians' }] },
      { title: 'Site information', fields: [
        { k: 'siteName', l: 'Site name' },
        { k: 'siteType', l: 'Site type', list: ['Residence House', 'Apartment', 'Office', 'Godown', 'Warehouse', 'School', 'College / University', 'Shop / Retail Store', 'Supermarket', 'Commercial Building', 'Factory', 'Hotel / Lodge', 'Restaurant', 'Hospital / Clinic', 'Bank', 'Petrol Station', 'Government Office', 'Church / Mosque', 'Farm / Estate', 'Construction Site'] },
        { k: 'siteLocation', l: 'Location' }, { k: 'endUser', l: 'End user' }] },
      { title: 'Support information', fields: [
        { k: 'supportType', l: 'Support type', list: ['On-site Technical Support', 'Remote Technical Support', 'Online Support (WhatsApp)', 'Online Support (Remote Desktop)', 'Phone Support', 'Installation Support', 'Maintenance Visit'] },
        { k: 'products', l: 'Products used', type: 'area', wide: true, hint: 'One product per line, e.g. Hikvision Motorgate' }] },
      { title: 'Technical issue', fields: [{ k: 'issue', l: 'What was the problem?', type: 'area', wide: true }] },
      { title: 'Solution provided', fields: [{ k: 'solution', l: 'What did you do to fix it?', type: 'area', wide: true, chips: SOLUTION_OPTIONS, hint: 'Tick one or more actions above, then keep typing to add details. One action per line.' }] },
      { title: 'Outcome', fields: [{ k: 'outcome', l: 'Results', type: 'area', wide: true, hint: 'One result per line. Each line gets a green tick in the report.' }] },
      { title: 'Case details', fields: [
        { k: 'date', l: 'Support date', type: 'date' }, { k: 'caseId', l: 'Case ID' }, { k: 'engineer', l: 'Support engineer' },
        { k: 'supportLocation', l: 'Support location' }, { k: 'timeSpent', l: 'Time spent', ph: 'e.g. 3 hrs' },
        { k: 'status', l: 'Case status', list: ['Closed', 'Open', 'Pending'] }] },
      { title: 'Photo evidence', photoTypes: true },
    ],
  },
  trainings: {
    label: 'Training session', plural: 'Training sessions', newLabel: 'New training session',
    blank: (list) => ({
      id: uid(), program: '', company: '', venue: '', date: today(), week: '', duration: '',
      trainerName: 'Frank Magai', trainerCompany: 'Hikvision Tanzania', trainerPosition: 'Technical Support Engineer', trainerSpec: '',
      audience: '', topics: '', outcome: '', sessionId: seq(list, 'TR'), status: 'Completed', count: '',
      participants: [{ name: '', company: '', position: '', qualification: '' }],
    }),
    title: (r) => r.program || 'Untitled training',
    meta: (r) => [r.company, fmtDate(r.date), trainCount(r) ? trainCount(r) + ' technicians' : ''].filter(Boolean),
    thumb: (r) => r.photo_group || r.photo_practical || r.photo_classroom,
    slides: trainingSlides,
    file: (r) => `${safeName(r.sessionId)}_${safeName(r.program)}`,
    sections: [
      { title: 'Training information', fields: [
        { k: 'program', l: 'Programme', list: Object.keys(PROGRAMS), wide: true }, { k: 'company', l: 'Company' }, { k: 'venue', l: 'Venue / location' },
        { k: 'date', l: 'Training date', type: 'date' }, { k: 'week', l: 'Week / session', ph: 'e.g. Week 1' }, { k: 'duration', l: 'Duration', ph: 'e.g. 3 days, 8 hrs' }] },
      { title: 'Trainer information', fields: [
        { k: 'trainerName', l: 'Trainer name' }, { k: 'trainerCompany', l: 'Company' }, { k: 'trainerPosition', l: 'Position' }, { k: 'trainerSpec', l: 'Specialization' }] },
      { title: 'Required technicians', fields: [{ k: 'audience', l: 'Who is this training for?', type: 'area', wide: true, hint: 'The type of technicians required, e.g. installers of CCTV and access control, at least 1 year experience.' }] },
      { title: 'Topics covered', fields: [{ k: 'topics', l: 'Topics', type: 'area', wide: true, hint: 'One topic per line. Choosing a programme above fills this in for you.' }] },
      { title: 'Outcome', fields: [
        { k: 'outcome', l: 'Results', type: 'area', wide: true, hint: 'One result per line, e.g. All technicians completed the practical.' },
        { k: 'status', l: 'Status', list: ['Completed', 'Planned', 'Cancelled'] }, { k: 'sessionId', l: 'Session ID' }] },
      { title: 'Technicians trained', people: true },
      { title: 'Photo evidence', photos: [
        { k: 'classroom', l: 'Classroom teaching', ratio: '188/236' },
        { k: 'practical', l: 'Practical / hands-on', ratio: '193/236' },
        { k: 'group', l: 'Group photo with participants', ratio: '216/273' }] },
    ],
  },
};

export const STORE_KEYS = Object.keys(KINDS);

export function cleanForExport(r) {
  if (r.participants) return { ...r, participants: r.participants.filter((p) => p.name && p.name.trim()) };
  return r;
}
