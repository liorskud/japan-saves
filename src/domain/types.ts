/** Core data model. Pure types – shared by the web app and any future native app. */

export type Category = 'food' | 'shopping' | 'attractions' | 'transport' | 'stay' | 'nightlife' | 'other';
export type Confidence = 'checked' | 'caption' | 'estimate';
export type Booking = 'required' | 'recommended' | 'no' | 'unknown';
export type Currency = 'ILS' | 'USD' | 'EUR' | 'JPY';
export type MarkStatus = 'want' | 'good' | 'bad';

export interface Photo {
  url: string;       // full image
  thumb: string;     // ~800px
  credit: string;    // author
  license: string;   // e.g. CC BY-SA 4.0
  source: string;    // page to credit / open
  kind?: 'place' | 'dish' | 'area'; // dish/area = illustrative, not the venue itself
}

export interface Place {
  id: string;
  cat: Category;
  sym: string;
  name: string;
  nameJa?: string;
  /** What to order (food) */
  order?: string;
  /** Kind of place (non-food) */
  type?: string;
  /** Short "what to expect" text shown under "See more" */
  about?: string;
  /** Price tier 1–5 and typical spend per person in yen (drives currency display) */
  price: number;
  yen?: [number, number];
  city: string;
  area?: string;
  lat: number;
  lng: number;
  approx?: boolean;
  addressEn?: string;
  addressJa?: string;
  hours?: string;
  /** Machine-readable OSM opening_hours, when known */
  osmHours?: string;
  days?: string;
  arrive?: string;
  arriveBasis?: 'opening' | 'post' | 'estimate';
  booking?: Booking;
  bookingHow?: string;
  bookingUrl?: string;
  phone?: string;
  website?: string;
  time?: string;
  season?: string;
  recDay?: string;
  crowd?: string;
  bestDays?: string;
  charge?: string;
  smoking?: string;
  dress?: string;
  req?: string;
  luggage?: string;
  lastDep?: string;
  station?: string;
  checkin?: string;
  room?: string;
  onsen?: string;
  /** Diet facts: which restrictions the place can serve */
  diet?: { pork?: boolean; shellfish?: boolean; vegetarian?: boolean; noPorkOption?: boolean };
  tattooFriendly?: boolean | null;
  stayType?: 'dorm' | 'capsule' | 'business' | 'ryokan' | 'luxury';
  sharedBath?: boolean;
  notes?: string;
  ig: string[];
  photos?: Photo[];
  conf: Confidence;
  plan?: { day: number | null; order: number | null };
  sources?: string[];
}

export interface ReviewItem { code: string; ig: string; what: string; guess: string }

export type BudgetLevel = 'backpacker' | 'mid' | 'comfort' | 'luxury';
export type TransportStyle = 'cheapest' | 'balanced' | 'comfort';

export interface Settings {
  currency: Currency;
  budget: BudgetLevel;
  /** Yen per person upper bounds for $..$$$$ (the 5th tier is everything above) */
  priceBands: [number, number, number, number];
  stay: { dorm: boolean; sharedBath: boolean; capsule: boolean; ryokan: boolean };
  transport: TransportStyle;
  travellers: number;
  diet: { noPork: boolean; noShellfish: boolean; vegetarian: boolean };
  tattoos: boolean;
  smokeFree: boolean;
  hide: 'none' | 'bad' | 'visited';
  base?: { name: string; lat: number; lng: number };
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'ILS',
  budget: 'mid',
  priceBands: [1500, 4000, 10000, 25000],
  stay: { dorm: false, sharedBath: false, capsule: true, ryokan: true },
  transport: 'balanced',
  travellers: 1,
  diet: { noPork: false, noShellfish: false, vegetarian: false },
  tattoos: false,
  smokeFree: false,
  hide: 'none',
};
