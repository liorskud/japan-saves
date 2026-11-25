import type { Category, MarkStatus, Place, Settings } from './types';
import { tierFor } from './money';

export const CATS: Record<Category, { label: string; color: string; hex: string }> = {
  food: { label: 'Food', color: 'var(--c-food)', hex: '#d0462f' },
  shopping: { label: 'Shopping & markets', color: 'var(--c-shopping)', hex: '#b8327a' },
  attractions: { label: 'Attractions', color: 'var(--c-attractions)', hex: '#2f6db3' },
  transport: { label: 'Transportation', color: 'var(--c-transport)', hex: '#3a8f6b' },
  stay: { label: 'Hotels & stay', color: 'var(--c-stay)', hex: '#7a55b8' },
  nightlife: { label: 'Nightlife', color: 'var(--c-nightlife)', hex: '#d68a13' },
  other: { label: 'Other', color: 'var(--c-other)', hex: '#6c6f78' },
};

export const CONF_LABEL = { checked: 'Details checked online', caption: 'From the post', estimate: 'Partly estimated – confirm before going' } as const;
export const BASIS_LABEL = { opening: 'based on opening time', post: 'from the post', estimate: 'estimate' } as const;
export const BOOKING_LABEL = { required: 'Required', recommended: 'Recommended', no: 'Not needed', unknown: 'Check before going' } as const;

/** Effective price tier: from yen spend when known (using the user's bands), else the stored tier. */
export function tier(p: Place, s: Settings): number {
  if (p.yen) return tierFor((p.yen[0] + p.yen[1]) / 2, s.priceBands);
  return p.price;
}
export const dollars = (n: number) => '$'.repeat(Math.max(1, Math.min(5, n)));

/** Pin title, following the agreed format per category. */
export function titleOf(p: Place, s: Settings): string {
  const $ = dollars(tier(p, s));
  switch (p.cat) {
    case 'food': return `${p.sym} ${p.name} – ${p.order ?? ''} · ${$}`;
    case 'shopping': return `${p.sym} ${p.name} – ${p.type ?? ''} · ${$}`;
    case 'attractions': return `${p.sym} ${p.name} – ${p.type ?? ''}${p.recDay ? ' – ' + p.recDay : ''} · ${$}`;
    case 'transport': return `${p.sym} ${p.name}${p.req ? ' – needs: ' + p.req : ''}`;
    case 'stay': return `${p.sym} ${p.type ?? 'Stay'} – ${p.name} · ${$}`;
    case 'nightlife': return `${p.sym} ${p.name} – ${p.type ?? ''}${p.crowd ? ' (' + p.crowd.split(' (')[0] + ')' : ''} · ${$}`;
    default: return `${p.sym} ${p.name} – ${p.type ?? ''} · ${$}`;
  }
}

export interface Filters {
  q: string;
  cats: Set<Category>;
  cities: Set<string>;
  tiers: Set<number>;
  marks: Set<MarkStatus | 'none'>;
  booking: 'any' | 'walkin' | 'bookable';
  conf: 'any' | 'checked';
  fitsMe: boolean; // diet, tattoos, smoke-free, stay preferences
}
export const emptyFilters = (): Filters => ({ q: '', cats: new Set(), cities: new Set(), tiers: new Set(), marks: new Set(), booking: 'any', conf: 'any', fitsMe: false });

export function activeFilterCount(f: Filters): number {
  return f.cities.size + f.tiers.size + f.marks.size + (f.booking !== 'any' ? 1 : 0) + (f.conf !== 'any' ? 1 : 0) + (f.fitsMe ? 1 : 0);
}

/** Does a place suit the traveller profile? Unknowns pass (we don't hide what we can't judge). */
export function fitsProfile(p: Place, s: Settings): boolean {
  if (s.diet.vegetarian && p.diet?.vegetarian === false) return false;
  if (s.diet.noPork && p.diet?.pork === true && !p.diet.noPorkOption) return false;
  if (s.diet.noShellfish && p.diet?.shellfish === true) return false;
  if (s.tattoos && p.tattooFriendly === false) return false;
  if (s.smokeFree && p.cat === 'nightlife' && /allowed/i.test(p.smoking ?? '')) return false;
  if (p.cat === 'stay') {
    if (p.stayType === 'dorm' && !s.stay.dorm) return false;
    if (p.stayType === 'capsule' && !s.stay.capsule) return false;
    if (p.stayType === 'ryokan' && !s.stay.ryokan) return false;
    if (p.sharedBath && !s.stay.sharedBath) return false;
  }
  return true;
}

const norm = (x: unknown) => String(x ?? '').toLowerCase();

export function visible(places: Place[], f: Filters, s: Settings, marks: Record<string, MarkStatus>): Place[] {
  const q = norm(f.q).trim();
  return places.filter((p) => {
    const m = marks[p.id];
    if (s.hide === 'bad' && m === 'bad') return false;
    if (s.hide === 'visited' && (m === 'good' || m === 'bad')) return false;
    if (f.cats.size && !f.cats.has(p.cat)) return false;
    if (f.cities.size && !f.cities.has(p.city)) return false;
    if (f.tiers.size && !f.tiers.has(tier(p, s))) return false;
    if (f.marks.size && !f.marks.has(m ?? 'none')) return false;
    if (f.booking === 'walkin' && p.booking === 'required') return false;
    if (f.booking === 'bookable' && !(p.booking === 'required' || p.booking === 'recommended')) return false;
    if (f.conf === 'checked' && p.conf !== 'checked') return false;
    if (f.fitsMe && !fitsProfile(p, s)) return false;
    if (q && !norm([p.name, p.nameJa, p.order, p.type, p.area, p.city, p.about, p.notes].join(' ')).includes(q)) return false;
    return true;
  });
}
