import type { Currency, Settings } from './types';

/** Rates are "units of currency per 1 JPY". JPY is always 1. */
export type Rates = Record<Currency, number>;

export const SYMBOL: Record<Currency, string> = { ILS: '₪', USD: '$', EUR: '€', JPY: '¥' };

/** Fallback rates used until the live rates load (approximate, late 2026). */
export const FALLBACK_RATES: Rates = { JPY: 1, ILS: 0.0245, USD: 0.0066, EUR: 0.0058 };

export function convert(yen: number, to: Currency, rates: Rates): number {
  return yen * (rates[to] ?? 1);
}

/** Round to a "human" number for price ranges. */
function tidy(n: number, cur: Currency): number {
  if (cur === 'JPY') return n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
  if (n >= 100) return Math.round(n / 10) * 10;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}

export function money(yen: number, cur: Currency, rates: Rates): string {
  const v = tidy(convert(yen, cur, rates), cur);
  return SYMBOL[cur] + v.toLocaleString('en-US');
}

export function moneyRange([a, b]: [number, number], cur: Currency, rates: Rates): string {
  if (a === b) return money(a, cur, rates);
  return `${money(a, cur, rates)}–${tidy(convert(b, cur, rates), cur).toLocaleString('en-US')}`;
}

/** Price tier (1–5) for a yen amount, using the user's own bands. */
export function tierFor(yen: number, bands: Settings['priceBands']): number {
  const i = bands.findIndex((b) => yen < b);
  return i === -1 ? 5 : i + 1;
}

export const BUDGET_PRESETS: Record<Settings['budget'], Settings['priceBands']> = {
  backpacker: [1000, 2500, 6000, 15000],
  mid: [1500, 4000, 10000, 25000],
  comfort: [2500, 6000, 15000, 35000],
  luxury: [4000, 10000, 25000, 50000],
};

/**
 * Exchange-offer score, 0–10. Compares an offered rate with the mid-market rate.
 * `offered` and `mid` are both "how many TARGET units you get for 1 SOURCE unit".
 * Spread ≤0.5% → 10; ~1% → 9; ~2% → 8; ~3% → 7; ~5% → 5; ~8% → 2; ≥10% → 0 (scam territory).
 */
export function scoreOffer(offered: number, mid: number): { score: number; spreadPct: number; verdict: string } {
  const spreadPct = ((mid - offered) / mid) * 100;
  const s = spreadPct <= 0.5 ? 10 : spreadPct >= 10 ? 0 : Math.max(0, Math.min(10, 10.5 - spreadPct));
  const score = Math.round(s * 2) / 2;
  const verdict =
    spreadPct < 0 ? 'Better than the market rate – double-check fees or the amount you receive.'
    : score >= 9 ? 'Excellent – about as good as it gets.'
    : score >= 7 ? 'Fair – typical of a good exchange office or card.'
    : score >= 5 ? 'Poor – you are paying a noticeable margin.'
    : score >= 2 ? 'Bad – airport/hotel-style margin. Walk away if you can.'
    : 'Scam-level margin. Do not exchange here.';
  return { score, spreadPct, verdict };
}
