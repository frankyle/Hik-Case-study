import { dbAll, dbPut, metaGet, metaSet } from './db.js';
import { ingestPhoto } from './photos.js';
import { uid } from './helpers.js';
import products from '../assets/seed/products.jpg';
import site from '../assets/seed/site.jpg';
import engineer from '../assets/seed/engineer.jpg';

async function photo(url, name) {
  const blob = await (await fetch(url)).blob();
  return (await ingestPhoto(new File([blob], name + '.jpg', { type: 'image/jpeg' }))).id;
}

/** One sample support case on first run, same as the original app. */
export async function seedOnce() {
  if (await metaGet('seeded')) return;
  if (!(await dbAll('cases')).length) {
    await dbPut('cases', {
      id: uid(), techName: 'Maximillian', techCompany: 'Max Technologies', techPosition: 'Technician', techExp: '4 Years',
      techSpec: 'Physical Security Systems Installation', techTeam: '3 Technicians',
      siteName: 'Mr Shimbosho', siteType: 'Residence House', siteLocation: 'Geza Ulole, Dar es salaam', endUser: 'Mr Shimbosho',
      supportType: 'On-site Technical Support', products: 'Hikvision Motorgate\nHikvision Energizer',
      issue: 'The electric fence was producing huge sound and Motorgate was being stopped during the operation.',
      solution: 'Changed the internal transformer and upgraded the firmware of the Motorgate.',
      outcome: 'Issue resolved\nThe Energizer works perfectly, producing normal sound.\nMotorgate firmware upgraded and configured.',
      date: '2026-09-01', caseId: 'TS-2026-0303-001', engineer: 'Frank Magai', supportLocation: 'Geza Ulole, Dsm', timeSpent: '3 hrs', status: 'Closed',
      photo_products: await photo(products, 'products'), photo_site: await photo(site, 'site'), photo_engineer: await photo(engineer, 'engineer'),
      updated: Date.now(),
    });
  }
  await metaSet('seeded', 1);
}
