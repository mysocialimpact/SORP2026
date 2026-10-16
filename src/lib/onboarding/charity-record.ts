import type {Candidate} from '../../app/sorp-public-model';
/** A record may list several registrations. Select only the single identity
 * belonging to the regulator supplying the official record; never guess between matches. */
export function canonicalCharityRecord(value: unknown): Candidate | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Candidate;
  if (typeof c.name !== 'string' || !c.name.trim() || typeof c.officialUrl !== 'string' || !['string','number'].includes(typeof c.registrationNumber)) return null;
  try {
    const url = new URL(c.officialUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const regulator = url.hostname === 'register-of-charities.charitycommission.gov.uk' ? 'ew'
      : ['www.oscr.org.uk','oscr.org.uk'].includes(url.hostname) ? 'sc'
      : ['www.charitycommissionni.org.uk','charitycommissionni.org.uk'].includes(url.hostname) ? 'ni' : '';
    if (!regulator) return null;
    const numbers = [...new Set(String(c.registrationNumber).toUpperCase().match(/\b(?:SC\d{6}|NIC\d{6}|\d{5,8})\b/g) || [])]
      .filter(n => regulator === 'ew' ? /^\d{5,8}$/.test(n) : regulator === 'sc' ? /^SC\d{6}$/.test(n) : /^NIC\d{6}$/.test(n));
    if (numbers.length !== 1) return null;
    return {...c,registrationNumber:numbers[0]};
  } catch { return null; }
}
