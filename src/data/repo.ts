import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { MarkStatus, Place, ReviewItem, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';

/**
 * Data layer. The UI only talks to this module.
 * - Signed out: places come from the bundled snapshot, marks/settings live on this device.
 * - Signed in: everything syncs through Supabase (row-level security decides who sees which map).
 * Swapping Supabase for another backend means re-implementing this file only.
 */

const SUPABASE_URL = 'https://rjsdfqcgalbzoliklbhf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VwkVUnXlnMVoLYd6Zpf8Bw_yKDpo6jc'; // publishable: safe in the browser, RLS protects data
export const DEFAULT_MAP_ID = '7a9a0c5e-0000-4000-8000-00000000a1b1';

export const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export interface Snapshot {
  places: Place[];
  review: ReviewItem[];
  priceScale: Record<string, string>;
  updated: string;
}

const LS = {
  get<T>(k: string, fallback: T): T {
    try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
};

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/japan.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`places ${res.status}`);
  return res.json();
}

export async function session(): Promise<Session | null> {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export function onAuth(cb: (s: Session | null) => void) {
  sb.auth.onAuthStateChange((_e, s) => cb(s));
}

export async function signIn(email: string): Promise<string | null> {
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  return error ? error.message : null;
}
export async function signOut() { await sb.auth.signOut(); }

/** Places of a map from the server; null when the user can't read it (falls back to the snapshot). */
export async function serverPlaces(mapId = DEFAULT_MAP_ID): Promise<Place[] | null> {
  const { data, error } = await sb.from('places').select('id,data').eq('map_id', mapId);
  if (error || !data?.length) return null;
  return data.map((r) => ({ ...(r.data as Place), id: r.id }));
}

/* ---------- marks ---------- */
export type Marks = Record<string, MarkStatus>;

export async function loadMarks(signedIn: boolean, mapId = DEFAULT_MAP_ID): Promise<Marks> {
  const local = LS.get<Marks>('js.marks', {});
  if (!signedIn) return local;
  const { data, error } = await sb.from('marks').select('place_id,status').eq('map_id', mapId);
  if (error) return local;
  const server: Marks = Object.fromEntries(data.map((r) => [r.place_id, r.status as MarkStatus]));
  // First sign-in on this device: push local marks the server doesn't have yet.
  const missing = Object.entries(local).filter(([id]) => !(id in server));
  if (missing.length) {
    await sb.from('marks').upsert(missing.map(([place_id, status]) => ({ place_id, status, map_id: mapId, user_id: (sbUser()) })));
    missing.forEach(([id, st]) => (server[id] = st));
  }
  LS.set('js.marks', server);
  return server;
}

let currentUserId: string | null = null;
export const sbUser = () => currentUserId;
export const setUser = (id: string | null) => { currentUserId = id; };

export async function setMark(placeId: string, status: MarkStatus | null, marks: Marks, mapId = DEFAULT_MAP_ID) {
  if (status) marks[placeId] = status; else delete marks[placeId];
  LS.set('js.marks', marks);
  if (!currentUserId) return;
  if (status) await sb.from('marks').upsert({ user_id: currentUserId, map_id: mapId, place_id: placeId, status, updated_at: new Date().toISOString() });
  else await sb.from('marks').delete().match({ user_id: currentUserId, map_id: mapId, place_id: placeId });
}

/* ---------- settings ---------- */
export async function loadSettings(signedIn: boolean): Promise<Settings> {
  const local = { ...DEFAULT_SETTINGS, ...LS.get<Partial<Settings>>('js.settings', {}) };
  if (!signedIn || !currentUserId) return local;
  const { data } = await sb.from('profiles').select('settings').eq('id', currentUserId).maybeSingle();
  const server = (data?.settings ?? {}) as Partial<Settings>;
  if (!Object.keys(server).length) { void saveSettings(local); return local; }
  const merged = { ...DEFAULT_SETTINGS, ...server };
  LS.set('js.settings', merged);
  return merged;
}

let saveTimer: number | undefined;
export function saveSettings(s: Settings) {
  LS.set('js.settings', s);
  if (!currentUserId) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void sb.from('profiles').upsert({ id: currentUserId, settings: s, updated_at: new Date().toISOString() });
  }, 600);
}

/* ---------- review answers ---------- */
export async function saveAnswer(code: string, answer: string, mapId = DEFAULT_MAP_ID): Promise<boolean> {
  LS.set(`js.answer.${code}`, answer);
  if (!currentUserId) return false;
  const { error } = await sb.from('review_answers').upsert({ map_id: mapId, code, answer, user_id: currentUserId, updated_at: new Date().toISOString() });
  return !error;
}
export async function loadAnswers(mapId = DEFAULT_MAP_ID): Promise<Record<string, string>> {
  if (!currentUserId) return {};
  const { data } = await sb.from('review_answers').select('code,answer').eq('map_id', mapId);
  return Object.fromEntries((data ?? []).map((r) => [r.code, r.answer]));
}
export const localAnswer = (code: string) => LS.get<string>(`js.answer.${code}`, '');

/* ---------- sharing ---------- */
export async function myRole(mapId = DEFAULT_MAP_ID): Promise<'owner' | 'editor' | 'viewer' | null> {
  if (!currentUserId) return null;
  const { data: m } = await sb.from('maps').select('owner_id').eq('id', mapId).maybeSingle();
  if (!m) return null;
  if (m.owner_id === currentUserId) return 'owner';
  const { data: mm } = await sb.from('map_members').select('role').eq('map_id', mapId).eq('user_id', currentUserId).maybeSingle();
  return (mm?.role as 'editor' | 'viewer') ?? null;
}
export async function invite(email: string, role: 'editor' | 'viewer', mapId = DEFAULT_MAP_ID): Promise<string | null> {
  const { error } = await sb.from('map_invites').upsert({ map_id: mapId, email: email.trim().toLowerCase(), role, invited_by: currentUserId });
  return error ? error.message : null;
}
export async function claimInvites(): Promise<void> {
  await sb.rpc('claim_invites');
}

/* ---------- exchange rates (ECB via Frankfurter, no key) ---------- */
export async function liveRates(): Promise<{ ILS: number; USD: number; EUR: number; date: string } | null> {
  const cached = LS.get<{ at: number; v: { ILS: number; USD: number; EUR: number; date: string } } | null>('js.rates', null);
  if (cached && Date.now() - cached.at < 6 * 3600e3) return cached.v;
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=JPY&to=ILS,USD,EUR');
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const v = { ...j.rates, date: j.date };
    LS.set('js.rates', { at: Date.now(), v });
    return v;
  } catch { return cached?.v ?? null; }
}
