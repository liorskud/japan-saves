import type { Settings, TransportStyle } from './types';

/**
 * Rough door-to-door estimates for Japan, from straight-line distance.
 * Good enough to compare options and budget; not a route planner (the place card links to Google Maps for that).
 */
export interface Option {
  mode: 'walk' | 'train' | 'bus' | 'taxi' | 'shinkansen' | 'highwayBus' | 'flight' | 'car';
  label: string;
  minutes: number;
  /** Yen per person */
  yen: number;
  note?: string;
}

const R = 6371;
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const round = (n: number, to = 10) => Math.max(0, Math.round(n / to) * to);

export function options(distKm: number, travellers: number): Option[] {
  const d = distKm * 1.3; // road/rail detour factor
  const o: Option[] = [];
  if (d <= 3) o.push({ mode: 'walk', label: 'Walk', minutes: (d / 4.8) * 60, yen: 0 });
  if (d <= 70) o.push({ mode: 'train', label: 'Train / metro', minutes: 12 + (d / 30) * 60, yen: round(170 + d * 22), note: 'IC card (Suica/PASMO/ICOCA)' });
  if (d <= 25) o.push({ mode: 'bus', label: 'City bus', minutes: 10 + (d / 14) * 60, yen: d <= 8 ? 220 : round(220 + (d - 8) * 30) });
  if (d <= 60) {
    const fare = 500 + Math.max(0, (d - 1.1) / 0.255) * 100;
    o.push({ mode: 'taxi', label: travellers > 1 ? `Taxi (split ${travellers} ways)` : 'Taxi', minutes: 5 + (d / 22) * 60, yen: round(fare / Math.max(1, travellers), 100), note: '+20% 22:00–05:00; GO / Uber apps work' });
  }
  if (distKm > 60) {
    o.push({ mode: 'shinkansen', label: 'Shinkansen / limited express', minutes: 35 + (distKm / 190) * 60, yen: round(distKm * 28, 100), note: 'Reserved seat; a JR Pass may pay off for several long trips' });
    o.push({ mode: 'highwayBus', label: 'Highway bus', minutes: 30 + (d / 65) * 60, yen: round(d * 11, 100), note: 'Cheapest long-distance; night buses save a hotel night' });
    o.push({ mode: 'car', label: 'Rental car', minutes: (d / 55) * 60, yen: round((7000 + d * 40) / Math.max(1, travellers), 100), note: 'Needs a 1949 International Driving Permit; tolls + fuel included roughly' });
  }
  if (distKm > 400) o.push({ mode: 'flight', label: 'Domestic flight', minutes: 150 + (distKm / 700) * 60, yen: round(6000 + distKm * 10, 500), note: 'LCCs (Peach, Jetstar, Zipair) cheapest; incl. getting to the airport' });
  return o.map((x) => ({ ...x, minutes: Math.round(x.minutes) }));
}

/** Value of an hour of travel time (yen) per travel style – decides the recommendation. */
const TIME_VALUE: Record<TransportStyle, number> = { cheapest: 400, balanced: 2000, comfort: 8000 };
const COMFORT_BONUS: Partial<Record<Option['mode'], Record<TransportStyle, number>>> = {
  taxi: { cheapest: 0, balanced: 0, comfort: -1500 },
  shinkansen: { cheapest: 0, balanced: -1000, comfort: -4000 },
  highwayBus: { cheapest: 0, balanced: 1500, comfort: 6000 },
  bus: { cheapest: 0, balanced: 200, comfort: 1200 },
  walk: { cheapest: 0, balanced: 0, comfort: 300 },
};

export function recommend(opts: Option[], s: Pick<Settings, 'transport'>): Option | undefined {
  const cost = (x: Option) => x.yen + (x.minutes / 60) * TIME_VALUE[s.transport] + (COMFORT_BONUS[x.mode]?.[s.transport] ?? 0);
  return [...opts].sort((a, b) => cost(a) - cost(b))[0];
}
