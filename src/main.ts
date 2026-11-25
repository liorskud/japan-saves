import './styles.css';
import type { Category, MarkStatus, Place, ReviewItem, Settings } from './domain/types';
import { CATS, CONF_LABEL, BASIS_LABEL, BOOKING_LABEL, dollars, emptyFilters, activeFilterCount, tier, titleOf, visible, fitsProfile, type Filters } from './domain/rules';
import { FALLBACK_RATES, BUDGET_PRESETS, money, moneyRange, scoreOffer, SYMBOL, type Rates } from './domain/money';
import { km, options as travelOptions, recommend } from './domain/transport';
import { GUIDES, planEsim } from './domain/guides';
import * as repo from './data/repo';
import * as M from './ui/map';

/* ============ state ============ */
const S = {
  places: [] as Place[],
  review: [] as ReviewItem[],
  marks: {} as Record<string, MarkStatus>,
  settings: null as unknown as Settings,
  filters: emptyFilters(),
  rates: { ...FALLBACK_RATES } as Rates,
  ratesDate: '' as string,
  user: null as null | { id: string; email: string },
  role: null as null | 'owner' | 'editor' | 'viewer',
  answers: {} as Record<string, string>,
  view: 'map' as 'map' | 'list' | 'guides' | 'settings',
  guide: null as null | string,
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeUrl = (u?: string) => (u && /^https:\/\//.test(u) ? u : '');
const igUrl = (c: string) => (/^[\w-]{5,20}$/.test(c) ? `https://www.instagram.com/p/${c}/` : '');
const gmaps = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.addressJa || p.name) + ' ' + (p.addressJa ? '' : p.city))}`;
const gmapsDir = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=transit`;
const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);
const cur = () => S.settings.currency;
const yen = (n: number) => money(n, cur(), S.rates);

function toast(msg: string) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout((toast as unknown as { t: number }).t);
  (toast as unknown as { t: number }).t = window.setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============ boot ============ */
async function boot() {
  const snap = await repo.loadSnapshot();
  S.places = snap.places; S.review = snap.review;
  const sess = await repo.session();
  if (sess) await onSignedIn(sess.user.id, sess.user.email ?? '');
  S.settings = await repo.loadSettings(!!S.user);
  S.marks = await repo.loadMarks(!!S.user);
  M.initMap($('map'), openPlace);
  renderAll();
  M.fitTo(S.places);
  repo.liveRates().then((r) => { if (r) { S.rates = { JPY: 1, ILS: r.ILS, USD: r.USD, EUR: r.EUR }; S.ratesDate = r.date; renderAll(); } });
  repo.onAuth(async (s) => {
    if (s && s.user.id !== S.user?.id) { await onSignedIn(s.user.id, s.user.email ?? ''); S.settings = await repo.loadSettings(true); S.marks = await repo.loadMarks(true); renderAll(); toast('Signed in – syncing'); }
    if (!s && S.user) { S.user = null; S.role = null; repo.setUser(null); renderAll(); }
  });
}
async function onSignedIn(id: string, email: string) {
  S.user = { id, email }; repo.setUser(id);
  await repo.claimInvites().catch(() => {});
  S.role = await repo.myRole();
  const server = await repo.serverPlaces();
  if (server?.length) S.places = server;
  S.answers = await repo.loadAnswers();
}

/* ============ rendering ============ */
function renderAll() {
  renderChips(); renderList(); M.setPlaces(currentPlaces(), S.marks);
  if (S.view === 'guides') renderGuides();
  if (S.view === 'settings') renderSettings();
  const open = S.review.filter((r) => !(S.answers[r.code] || repo.localAnswer(r.code))).length;
  $('reviewDot').hidden = !open;
}
const currentPlaces = () => visible(S.places, S.filters, S.settings, S.marks);

function renderChips() {
  const ps = visible(S.places, { ...S.filters, cats: new Set() }, S.settings, S.marks);
  const cnt = (c: Category) => ps.filter((p) => p.cat === c).length;
  $('catChips').innerHTML =
    `<button class="chip" data-cat="all" aria-pressed="${S.filters.cats.size === 0}">All <span class="n">${ps.length}</span></button>` +
    (Object.keys(CATS) as Category[]).filter((c) => cnt(c) || S.filters.cats.has(c))
      .map((c) => `<button class="chip" data-cat="${c}" aria-pressed="${S.filters.cats.has(c)}"><span class="d" style="background:${CATS[c].color}"></span>${CATS[c].label} <span class="n">${cnt(c)}</span></button>`).join('');
  const n = activeFilterCount(S.filters);
  $('filterCount').hidden = !n; $('filterCount').textContent = String(n);
}

function markTag(id: string) {
  const m = S.marks[id];
  return m === 'want' ? '<span class="tag want">★ Want</span>' : m === 'good' ? '<span class="tag good">✓ Great</span>' : m === 'bad' ? '<span class="tag bad">Visited – bad</span>' : '';
}
function card(p: Place) {
  const ph = p.photos?.[0]?.thumb;
  return `<button class="card" data-id="${esc(p.id)}" style="--cc:${CATS[p.cat].color}">
    <span class="ph" ${ph ? `style="background-image:url('${esc(ph)}')"` : ''}>${ph ? '' : esc(p.sym)}</span>
    <span><b>${esc(p.name)}</b><span class="s">${esc(p.cat === 'food' ? p.order : p.type)}</span>
    <span class="tags">${markTag(p.id)}<span class="tag">${dollars(tier(p, S.settings))}${p.yen ? ' · ' + esc(moneyRange(p.yen as [number, number], cur(), S.rates)) : ''}</span>
    <span class="tag">${esc(p.area?.split(' – ')[0] || p.city)}</span>${p.booking === 'required' ? '<span class="tag">Book ahead</span>' : ''}${p.conf === 'estimate' || p.approx ? '<span class="tag warn">Check</span>' : ''}</span></span></button>`;
}
function renderList() {
  const ps = currentPlaces();
  $('listLede').textContent = `${ps.length} of ${S.places.length} places shown · prices in ${cur()}`;
  const groups = new Map<string, Place[]>();
  ps.forEach((p) => groups.set(p.city, [...(groups.get(p.city) ?? []), p]));
  const review = S.review.filter((r) => !(S.answers[r.code] || repo.localAnswer(r.code)));
  $('list').innerHTML = (review.length ? `<div class="panel"><b>${review.length} saves need your answer</b><p class="lede" style="margin:4px 0 10px">Posts where no clear place was named.</p><button class="btn" id="openReview">Review them</button></div>` : '') +
    (ps.length ? [...groups].sort((a, b) => b[1].length - a[1].length).map(([city, items]) =>
      `<div class="city"><span>${esc(city)}</span><span>${items.length}</span></div><div class="grid">${items.map(card).join('')}</div>`).join('')
      : '<div class="empty">Nothing matches your filters.</div>');
}

/* ============ place sheet ============ */
function row(k: string, v?: string, extra = '') { return v ? `<dt>${esc(k)}</dt><dd>${esc(v)}${extra}</dd>` : ''; }
function openPlace(id: string) {
  const p = S.places.find((x) => x.id === id); if (!p) return;
  const s = S.settings;
  const photos = (p.photos ?? []).map((ph) => `<figure><img src="${esc(ph.thumb)}" alt="${esc(p.name)}" loading="lazy"><figcaption>${ph.kind === 'dish' ? 'Similar dish, not from this restaurant · ' : ph.kind === 'area' ? 'The area / building · ' : ''}<a href="${esc(safeUrl(ph.source))}" target="_blank" rel="noopener">${esc(ph.credit || 'Wikimedia Commons')}</a>, ${esc(ph.license)}</figcaption></figure>`).join('');
  const m = S.marks[id];
  const fits = fitsProfile(p, s);
  const extra: [string, string | undefined][] = ({
    food: [['Order', p.order]], shopping: [['Type', p.type]],
    attractions: [['Type', p.type], ['Best day', p.recDay], ['Best season', p.season]],
    transport: [['Requirements', p.req], ['Luggage', p.luggage], ['Last departure', p.lastDep]],
    stay: [['Type', p.type], ['Station', p.station], ['Check-in/out', p.checkin], ['Room / bed', p.room], ['Onsen & tattoos', p.onsen]],
    nightlife: [['Type', p.type], ['Crowd', p.crowd], ['Best days', p.bestDays], ['Cover / table', p.charge], ['Smoking', p.smoking], ['Dress code', p.dress]],
    other: [['Type', p.type]],
  } as Record<Category, [string, string | undefined][]>)[p.cat];

  const bookingVal = p.booking ? BOOKING_LABEL[p.booking] + (p.bookingHow ? ` – ${p.bookingHow}` : '') : '';
  const bookLinks = [
    p.bookingUrl ? `<a class="mini" href="${esc(safeUrl(p.bookingUrl))}" target="_blank" rel="noopener">Book online</a>` : '',
    p.phone ? `<a class="mini" href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">☎ ${esc(p.phone)}</a>` : '',
    p.website && p.website !== p.bookingUrl ? `<a class="mini" href="${esc(safeUrl(p.website))}" target="_blank" rel="noopener">Website</a>` : '',
    p.booking === 'required' || p.booking === 'recommended' ? `<a class="mini" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' ' + p.city + ' reservation')}" target="_blank" rel="noopener">Find booking page</a>` : '',
  ].filter(Boolean).join('');

  // transport
  let tx = '';
  if (s.base) {
    const d = km(s.base, p);
    const opts = travelOptions(d, s.travellers);
    const rec = recommend(opts, s);
    tx = `<h3>Getting there from ${esc(s.base.name)} <span class="basis">(${d.toFixed(d < 10 ? 1 : 0)} km straight line, estimates)</span></h3>
      <table class="tx"><tbody>${opts.sort((a, b) => a.minutes - b.minutes).map((o) => `<tr class="${o === rec ? 'rec' : ''}"><td>${esc(o.label)}${o.note ? `<div class="basis">${esc(o.note)}</div>` : ''}</td><td class="num">${fmtMin(o.minutes)}</td><td class="num">${o.yen ? yen(o.yen) : 'free'}</td></tr>`).join('')}</tbody></table>`;
  } else tx = `<p class="basis">Set your base (hotel) in Settings to see travel time and cost to here.</p>`;

  $('sheetBody').innerHTML = `
    ${photos ? `<div class="photos">${photos}</div>` : ''}
    <h2 id="shTitle">${esc(titleOf(p, s))}</h2>
    <div class="sub"><span style="color:${CATS[p.cat].color};font-weight:700">${esc(CATS[p.cat].label)}</span> · ${esc(CONF_LABEL[p.conf])}${fits ? '' : ' · <b style="color:var(--shu)">Doesn’t match your profile</b>'}</div>
    <div class="marks" role="group" aria-label="Your mark">
      <button data-m="want" aria-pressed="${m === 'want'}">★ Want to go</button>
      <button data-m="good" aria-pressed="${m === 'good'}">✓ Visited<br>great</button>
      <button data-m="bad" aria-pressed="${m === 'bad'}">✗ Visited<br>bad</button>
    </div>
    ${p.about ? `<details class="more"><summary>What to expect</summary><p>${esc(p.about)}</p></details>` : ''}
    <dl>
      <dt>Where</dt><dd><div class="addr">${p.addressJa ? `<span class="ja" lang="ja">${esc(p.addressJa)}</span>` : ''}<span>${esc(p.addressEn || [p.area, p.city].filter(Boolean).join(', '))}</span>
        <span class="row"><a class="mini" href="${esc(gmaps(p))}" target="_blank" rel="noopener">Google Maps</a><a class="mini" href="${esc(gmapsDir(p))}" target="_blank" rel="noopener">Directions</a>
        ${p.addressJa ? `<button class="mini" data-copy="${esc(p.addressJa)}">Copy</button><button class="mini" data-taxi="${esc(p.addressJa)}">Show taxi driver</button>` : ''}</span></div>${p.approx ? '<div class="basis">Pin location is approximate.</div>' : ''}</dd>
      ${row('Opening hours', p.hours)}
      ${row('Days', p.days)}
      ${row('Arrive', p.arrive, p.arriveBasis ? ` <span class="basis">(${BASIS_LABEL[p.arriveBasis]})</span>` : '')}
      ${bookingVal ? `<dt>Booking</dt><dd>${esc(bookingVal)}${bookLinks ? `<div class="row" style="margin-top:6px">${bookLinks}</div>` : ''}</dd>` : ''}
      ${row('Time needed', p.time)}
      ${extra.map(([k, v]) => (k === 'Order' ? '' : row(k, v))).join('')}
      <dt>Price</dt><dd>${dollars(tier(p, s))}${p.yen ? ` · about ${esc(moneyRange(p.yen as [number, number], cur(), S.rates))} per person` : ''}</dd>
    </dl>
    ${p.notes ? `<div class="note">${esc(p.notes)}</div>` : ''}
    ${tx}
    <div class="btns">${(p.ig ?? []).map(igUrl).filter(Boolean).map((u, i, a) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">Instagram post${a.length > 1 ? ' ' + (i + 1) : ''}</a>`).join('')}</div>
    ${p.sources?.length ? `<p class="src">Sources: ${esc(p.sources.join(' · '))}</p>` : ''}`;
  $('sheetBody').dataset.id = id;
  openSheet();
}
function openSheet() { $('scrim').classList.add('open'); $('sheet').classList.add('open'); $('sheet').scrollTop = 0; setTimeout(() => $('sheet').focus(), 60); }
function closeSheet() { $('scrim').classList.remove('open'); $('sheet').classList.remove('open'); }

/* ============ filters sheet ============ */
function openFilters() {
  const f = S.filters, s = S.settings;
  const cities = [...new Set(S.places.map((p) => p.city))].sort();
  const chip = (attr: string, val: string | number, on: boolean, label: string) => `<button class="chip" data-${attr}="${esc(val)}" aria-pressed="${on}">${label}</button>`;
  $('sheetBody').dataset.id = '';
  $('sheetBody').innerHTML = `<h2 id="shTitle">Filters</h2>
    <div class="fgroup"><h3>City</h3><div class="chips">${cities.map((c) => chip('city', c, f.cities.has(c), esc(c))).join('')}</div></div>
    <div class="fgroup"><h3>Price (your bands, per person)</h3><div class="chips">${[1, 2, 3, 4, 5].map((t) => chip('tier', t, f.tiers.has(t), dollars(t) + ' ' + esc(t === 5 ? '> ' + yen(s.priceBands[3]) : '≤ ' + yen(s.priceBands[t - 1])))).join('')}</div></div>
    <div class="fgroup"><h3>My marks</h3><div class="chips">${[['want', '★ Want to go'], ['good', '✓ Visited – great'], ['bad', '✗ Visited – bad'], ['none', 'Not marked']].map(([v, l]) => chip('mark', v, f.marks.has(v as MarkStatus), l)).join('')}</div></div>
    <div class="fgroup"><h3>Booking</h3><div class="seg" data-seg="booking">${[['any', 'Any'], ['walkin', 'Walk-in OK'], ['bookable', 'Needs booking']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${f.booking === v}">${l}</button>`).join('')}</div></div>
    <div class="fgroup"><h3>Reliability</h3><div class="seg" data-seg="conf">${[['any', 'All'], ['checked', 'Checked online only']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${f.conf === v}">${l}</button>`).join('')}</div></div>
    <label class="toggle"><span>Only places that fit my profile<br><span class="basis">Diet, tattoos, smoke-free, stay type (Settings)</span></span><input type="checkbox" id="fitsMe" ${f.fitsMe ? 'checked' : ''}></label>
    <div class="btns" style="margin-top:16px"><button class="btn" id="clearF">Clear all</button><button class="btn primary" id="doneF">Show ${currentPlaces().length} places</button></div>`;
  openSheet();
}

/* ============ guides ============ */
function renderGuides() {
  const g = GUIDES.find((x) => x.id === S.guide);
  if (!g) {
    $('guides').innerHTML = `<h1>Guides</h1><p class="lede">Practical, checked info for the trip – tap a topic.</p><div class="gcards">${GUIDES.map((x) => `<button class="gcard" data-guide="${x.id}"><span class="ic">${x.icon}</span><b>${esc(x.title)}</b><span>${esc(x.teaser)}</span></button>`).join('')}</div>`;
    return;
  }
  const tool = g.id === 'internet' ? esimTool() : g.id === 'money' ? fxTool() : '';
  $('guides').innerHTML = `<button class="back" data-guide="">‹ All guides</button><h1>${g.icon} ${esc(g.title)}</h1><p class="lede">Checked ${esc(g.checked)}. Prices and rules change – confirm on the official site before paying.</p>
    ${tool}
    ${g.sections.map((s) => `<h2>${esc(s.h)}</h2><ul>${s.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>${(s.links ?? []).map((l) => `<a class="mini" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' ')}`).join('')}
    <h2>Sources</h2><ul>${g.sources.map((l) => `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>`;
  if (g.id === 'internet') updateEsim();
  if (g.id === 'money') updateFx();
}
function esimTool() {
  return `<div class="panel"><h2 style="margin-top:0">eSIM planner</h2>
    <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="field"><span>Trip length (days)</span><input id="eDays" type="number" min="1" max="90" value="14" inputmode="numeric"></label>
      <label class="field"><span>Daily use</span><select id="eUse"><option value="light">Light – maps, chat</option><option value="normal" selected>Normal – + social, photos</option><option value="heavy">Heavy – video, hotspot</option></select></label>
    </div>
    <label class="toggle"><span>Share internet with a laptop / friend</span><input id="eHot" type="checkbox"></label>
    <label class="toggle"><span>Need a Japanese phone number</span><input id="eNum" type="checkbox"></label>
    <label class="toggle"><span>Going to mountains / countryside</span><input id="eRural" type="checkbox" checked></label>
    <div id="eOut" style="margin-top:12px"></div></div>`;
}
function updateEsim() {
  const r = planEsim(+($('eDays') as HTMLInputElement).value || 1, ($('eUse') as HTMLSelectElement).value as 'light', ($('eHot') as HTMLInputElement).checked, ($('eNum') as HTMLInputElement).checked, ($('eRural') as HTMLInputElement).checked);
  $('eOut').innerHTML = `<p><b>You need about ${r.total} GB</b> (${r.perDay} GB/day).</p>` + r.recs.map((x, i) => `<div class="rv"><b>${i === 0 ? '★ ' : ''}${esc(x.name)}</b><p>${esc(x.why)}</p><a class="mini" href="${esc(x.url)}" target="_blank" rel="noopener">Open site</a></div>`).join('');
}
function fxTool() {
  const opts = (['ILS', 'USD', 'EUR'] as const).map((c) => `<option value="${c}" ${c === (cur() === 'JPY' ? 'ILS' : cur()) ? 'selected' : ''}>${c}</option>`).join('');
  return `<div class="panel"><h2 style="margin-top:0">Rate check</h2>
    <p class="lede" id="fxNow"></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="field"><span>You pay in</span><select id="fxFrom">${opts}</select></label>
      <label class="field"><span>Yen you get per 1 unit</span><input id="fxOffer" type="number" step="0.01" inputmode="decimal" placeholder="e.g. 38.5"></label>
    </div>
    <div id="fxOut"></div></div>`;
}
function updateFx() {
  const from = ($('fxFrom') as HTMLSelectElement).value as 'ILS' | 'USD' | 'EUR';
  const mid = 1 / S.rates[from];
  $('fxNow').textContent = `Mid-market: 1 ${from} = ¥${mid.toFixed(2)} · ¥1,000 = ${SYMBOL[from]}${(1000 * S.rates[from]).toFixed(2)}${S.ratesDate ? ` (ECB, ${S.ratesDate})` : ' (offline estimate)'}`;
  const offer = +($('fxOffer') as HTMLInputElement).value;
  if (!offer) { $('fxOut').innerHTML = ''; return; }
  const r = scoreOffer(offer, mid);
  $('fxOut').innerHTML = `<div class="score"><span class="big">${r.score}</span><div><div class="meter"><i style="left:calc(${r.score * 10}% - 2px)"></i></div><p style="margin:8px 0 0"><b>${esc(r.verdict)}</b><br><span class="basis">Margin vs mid-market: ${r.spreadPct.toFixed(1)}% · on ${SYMBOL[from]}1,000 you’d get ¥${Math.round(offer * 1000).toLocaleString()} instead of ¥${Math.round(mid * 1000).toLocaleString()}</span></p></div></div>`;
}

/* ============ settings ============ */
function seg(key: string, opts: [string, string][], val: string) {
  return `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${val === v}">${esc(l)}</button>`).join('')}</div>`;
}
function renderSettings() {
  const s = S.settings;
  const bases = [['', 'None'], ...[...new Set(S.places.map((p) => p.city))].slice(0, 0)];
  void bases;
  $('settings').innerHTML = `<h1>Settings</h1><p class="lede">Your traveller profile changes prices, recommendations and what the “fits my profile” filter hides.</p>
    <div class="panel"><h3 style="margin-top:0">Currency</h3>${seg('currency', [['ILS', '₪ NIS'], ['USD', '$ USD'], ['EUR', '€ EUR'], ['JPY', '¥ Yen']], s.currency)}
      <p class="basis" style="margin:8px 0 0">${S.ratesDate ? `Live ECB rates from ${esc(S.ratesDate)}` : 'Using offline estimates until live rates load'} · ¥1,000 ≈ ${money(1000, s.currency === 'JPY' ? 'ILS' : s.currency, S.rates)}</p></div>
    <div class="panel"><h3 style="margin-top:0">Budget level</h3>${seg('budget', [['backpacker', 'Budget'], ['mid', 'Mid-range'], ['comfort', 'Comfort'], ['luxury', 'Luxury']], s.budget)}
      <p class="basis" style="margin:10px 0 6px">Price bands per person – what counts as $ to $$$$$ for you:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${s.priceBands.map((b, i) => `<label class="field" style="margin:0"><span>${dollars(i + 1)} up to ¥</span><input data-band="${i}" type="number" inputmode="numeric" value="${b}" step="500"></label>`).join('')}</div></div>
    <div class="panel"><h3 style="margin-top:0">Stay</h3>
      <label class="toggle"><span>Dorm beds are OK</span><input type="checkbox" data-stay="dorm" ${s.stay.dorm ? 'checked' : ''}></label>
      <label class="toggle"><span>Shared bathroom is OK</span><input type="checkbox" data-stay="sharedBath" ${s.stay.sharedBath ? 'checked' : ''}></label>
      <label class="toggle"><span>Capsule hotels are OK</span><input type="checkbox" data-stay="capsule" ${s.stay.capsule ? 'checked' : ''}></label>
      <label class="toggle"><span>Ryokan (futon, shared onsen)</span><input type="checkbox" data-stay="ryokan" ${s.stay.ryokan ? 'checked' : ''}></label></div>
    <div class="panel"><h3 style="margin-top:0">Transport style</h3>${seg('transport', [['cheapest', 'Cheapest'], ['balanced', 'Balanced'], ['comfort', 'Comfort']], s.transport)}
      <p class="basis" style="margin:8px 0 12px">Cheapest favours buses and trains; comfort favours taxis and Shinkansen. You always see every option with time and cost.</p>
      <label class="field"><span>Travellers (taxi and car costs are split)</span><input id="travellers" type="number" min="1" max="8" value="${s.travellers}" inputmode="numeric"></label>
      <label class="field"><span>Base for travel estimates (your hotel or a station)</span><select id="base"><option value="">Not set</option>${BASES.map((b, i) => `<option value="${i}" ${s.base?.name === b.name ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label></div>
    <div class="panel"><h3 style="margin-top:0">Food & fit</h3>
      <label class="toggle"><span>No pork</span><input type="checkbox" data-diet="noPork" ${s.diet.noPork ? 'checked' : ''}></label>
      <label class="toggle"><span>No shellfish</span><input type="checkbox" data-diet="noShellfish" ${s.diet.noShellfish ? 'checked' : ''}></label>
      <label class="toggle"><span>Vegetarian</span><input type="checkbox" data-diet="vegetarian" ${s.diet.vegetarian ? 'checked' : ''}></label>
      <label class="toggle"><span>I have tattoos (onsen/gym rules)</span><input type="checkbox" id="tattoos" ${s.tattoos ? 'checked' : ''}></label>
      <label class="toggle"><span>Avoid smoking bars</span><input type="checkbox" id="smokeFree" ${s.smokeFree ? 'checked' : ''}></label></div>
    <div class="panel"><h3 style="margin-top:0">Visited places</h3>${seg('hide', [['none', 'Show all'], ['bad', 'Hide “bad”'], ['visited', 'Hide all visited']], s.hide)}</div>
    <div class="panel" id="account"><h3 style="margin-top:0">Account & sharing</h3>${S.user ? `
        <p>Signed in as <b>${esc(S.user.email)}</b>${S.role ? ` · ${esc(S.role)} of this map` : ''}. Marks and settings sync across devices.</p>
        ${S.role === 'owner' ? `<label class="field"><span>Invite someone by email</span><input id="invEmail" type="email" placeholder="friend@email.com"></label>${seg('invRole', [['viewer', 'Can view'], ['editor', 'Can edit']], 'viewer')}<div class="btns" style="margin-top:10px"><button class="btn primary" id="invBtn">Send invite</button></div><p class="basis">They get access when they sign in with that email.</p>` : ''}
        <div class="btns" style="margin-top:12px"><button class="btn" id="signOut">Sign out</button></div>` : `
        <p>Sign in to sync your marks and settings between phone and computer, and to share this map.</p>
        <label class="field"><span>Email</span><input id="email" type="email" autocomplete="email" placeholder="you@email.com"></label>
        <div class="btns"><button class="btn primary" id="signIn">Email me a sign-in link</button></div>`}</div>
    <p class="src">Map © OpenStreetMap contributors, tiles by OpenFreeMap. Photos from Wikimedia Commons (credited on each). Rates: European Central Bank via Frankfurter.</p>`;
}

/** Common bases. A custom hotel can be added later from a place card ("Set as base"). */
const BASES = [
  { name: 'Shinjuku Station', lat: 35.6896, lng: 139.7006 }, { name: 'Shibuya Station', lat: 35.658, lng: 139.7016 },
  { name: 'Tokyo Station', lat: 35.6812, lng: 139.7671 }, { name: 'Asakusa', lat: 35.7118, lng: 139.7967 },
  { name: 'Ginza', lat: 35.6717, lng: 139.765 }, { name: 'Kyoto Station', lat: 34.9858, lng: 135.7588 },
  { name: 'Osaka – Namba', lat: 34.6661, lng: 135.5009 }, { name: 'Osaka – Umeda', lat: 34.7025, lng: 135.4959 },
  { name: 'Hakata Station (Fukuoka)', lat: 33.5897, lng: 130.4207 }, { name: 'Matsumoto Station', lat: 36.2309, lng: 137.9645 },
];

function saveS() { repo.saveSettings(S.settings); renderAll(); }

/* ============ events ============ */
function showView(v: typeof S.view) {
  S.view = v;
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${v}`));
  document.querySelectorAll('.tabbar button').forEach((b) => b.toggleAttribute('aria-current', (b as HTMLElement).dataset.view === v));
  document.querySelectorAll('.tabbar button[aria-current]').forEach((b) => b.setAttribute('aria-current', 'page'));
  if (v === 'map') setTimeout(M.resize, 30);
  if (v === 'guides') renderGuides();
  if (v === 'settings') renderSettings();
}
document.querySelector('.tabbar')!.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('[data-view]') as HTMLElement | null; if (b) showView(b.dataset.view as typeof S.view); });
$('q').addEventListener('input', (e) => { S.filters.q = (e.target as HTMLInputElement).value; renderAll(); });
$('catChips').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-cat]') as HTMLElement | null; if (!b) return;
  const c = b.dataset.cat as Category | 'all';
  if (c === 'all') S.filters.cats.clear(); else S.filters.cats.has(c) ? S.filters.cats.delete(c) : S.filters.cats.add(c);
  renderAll();
});
$('filterBtn').addEventListener('click', openFilters);
$('fit').addEventListener('click', () => M.fitTo(currentPlaces()));
$('locate').addEventListener('click', () => M.locate(toast));
$('scrim').addEventListener('click', closeSheet);
$('sheetX').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheet(); document.querySelector('.taxi')?.remove(); } });
$('list').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-id]') as HTMLElement | null; if (b) openPlace(b.dataset.id!);
  if ((e.target as HTMLElement).id === 'openReview') openReview();
});

$('sheetBody').addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const id = $('sheetBody').dataset.id;
  const mb = t.closest('[data-m]') as HTMLElement | null;
  if (mb && id) { const v = mb.dataset.m as MarkStatus; const next = S.marks[id] === v ? null : v; await repo.setMark(id, next, S.marks); renderAll(); openPlace(id); toast(next ? 'Saved' : 'Mark removed'); return; }
  const cp = t.closest('[data-copy]') as HTMLElement | null;
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy!); toast('Japanese address copied'); } catch { toast('Copy not allowed here'); } return; }
  const tx = t.closest('[data-taxi]') as HTMLElement | null;
  if (tx) { const d = document.createElement('div'); d.className = 'taxi open'; d.innerHTML = `<div><p lang="ja">${esc(tx.dataset.taxi)}</p><p style="font-size:20px;margin-top:20px">ここへ行ってください。<br><span style="font-size:14px;font-weight:400">(Please take me here) · tap to close</span></p></div>`; d.onclick = () => d.remove(); document.body.appendChild(d); return; }
  // filters
  const f = S.filters;
  const toggleSet = <T,>(set: Set<T>, v: T) => (set.has(v) ? set.delete(v) : set.add(v));
  const city = t.closest('[data-city]') as HTMLElement | null; if (city) { toggleSet(f.cities, city.dataset.city!); renderAll(); openFilters(); return; }
  const tr = t.closest('[data-tier]') as HTMLElement | null; if (tr) { toggleSet(f.tiers, +tr.dataset.tier!); renderAll(); openFilters(); return; }
  const mk = t.closest('[data-mark]') as HTMLElement | null; if (mk) { toggleSet(f.marks, mk.dataset.mark as MarkStatus); renderAll(); openFilters(); return; }
  const sg = t.closest('[data-seg] [data-v]') as HTMLElement | null;
  if (sg) { const k = (sg.parentElement as HTMLElement).dataset.seg as 'booking' | 'conf'; (f as unknown as Record<string, string>)[k] = sg.dataset.v!; renderAll(); openFilters(); return; }
  if (t.id === 'clearF') { S.filters = { ...emptyFilters(), q: f.q, cats: f.cats }; renderAll(); openFilters(); return; }
  if (t.id === 'doneF') { closeSheet(); M.fitTo(currentPlaces()); return; }
});
$('sheetBody').addEventListener('change', (e) => { if ((e.target as HTMLElement).id === 'fitsMe') { S.filters.fitsMe = (e.target as HTMLInputElement).checked; renderAll(); openFilters(); } });

function openReview() {
  $('sheetBody').dataset.id = '';
  $('sheetBody').innerHTML = `<h2 id="shTitle">Saves that need your answer</h2><p class="sub">No clear place in these posts. Answer here – I read the answers next time I update the map.</p>` +
    S.review.map((r) => { const a = S.answers[r.code] || repo.localAnswer(r.code); const u = igUrl(r.ig);
      return `<div class="rv"><b>${esc(r.what)}</b><p>${esc(r.guess)}</p>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">Open the post</a>` : ''}
      <label class="field" style="margin:10px 0 0"><span>Your answer</span><textarea rows="2" data-ans="${esc(r.code)}" placeholder="e.g. it’s Unagi Hirokawa in Arashiyama / remove it">${esc(a)}</textarea></label></div>`; }).join('');
  openSheet();
}
let ansT: number | undefined;
$('sheetBody').addEventListener('input', (e) => {
  const t = e.target as HTMLTextAreaElement; if (!t.dataset.ans) return;
  clearTimeout(ansT);
  ansT = window.setTimeout(async () => { const ok = await repo.saveAnswer(t.dataset.ans!, t.value.trim()); S.answers[t.dataset.ans!] = t.value.trim(); toast(ok ? 'Answer saved' : 'Saved on this device – sign in to sync'); renderAll(); }, 700);
});

$('guides').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('[data-guide]') as HTMLElement | null; if (b) { S.guide = b.dataset.guide || null; renderGuides(); $('view-guides').scrollTop = 0; } });
$('guides').addEventListener('input', (e) => { const id = (e.target as HTMLElement).id; if (id.startsWith('e')) updateEsim(); if (id.startsWith('fx')) updateFx(); });
$('guides').addEventListener('change', (e) => { const id = (e.target as HTMLElement).id; if (id.startsWith('e')) updateEsim(); if (id.startsWith('fx')) updateFx(); });

$('settings').addEventListener('click', async (e) => {
  const t = e.target as HTMLElement; const s = S.settings;
  const sg = t.closest('[data-set] [data-v]') as HTMLElement | null;
  if (sg) {
    const k = (sg.parentElement as HTMLElement).dataset.set!; const v = sg.dataset.v!;
    if (k === 'invRole') { sg.parentElement!.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === sg))); return; }
    if (k === 'budget') { s.budget = v as Settings['budget']; s.priceBands = [...BUDGET_PRESETS[s.budget]]; }
    else (s as unknown as Record<string, string>)[k] = v;
    saveS(); return;
  }
  if (t.id === 'signIn') { const em = ($('email') as HTMLInputElement).value.trim(); if (!/.+@.+\..+/.test(em)) return toast('Enter a valid email'); const err = await repo.signIn(em); toast(err ? `Couldn’t send: ${err}` : 'Check your email for the sign-in link'); }
  if (t.id === 'signOut') { await repo.signOut(); toast('Signed out'); }
  if (t.id === 'invBtn') {
    const em = ($('invEmail') as HTMLInputElement).value.trim(); const role = (document.querySelector('[data-set=invRole] [aria-pressed=true]') as HTMLElement)?.dataset.v as 'viewer' | 'editor';
    if (!/.+@.+\..+/.test(em)) return toast('Enter a valid email');
    const err = await repo.invite(em, role ?? 'viewer'); toast(err ? `Invite failed: ${err}` : `Invited ${em}`);
  }
});
$('settings').addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement; const s = S.settings;
  if (t.dataset.stay) { (s.stay as Record<string, boolean>)[t.dataset.stay] = t.checked; return saveS(); }
  if (t.dataset.diet) { (s.diet as Record<string, boolean>)[t.dataset.diet] = t.checked; return saveS(); }
  if (t.dataset.band) { const i = +t.dataset.band; s.priceBands[i] = Math.max(0, +t.value || 0); return saveS(); }
  if (t.id === 'tattoos') { s.tattoos = t.checked; return saveS(); }
  if (t.id === 'smokeFree') { s.smokeFree = t.checked; return saveS(); }
  if (t.id === 'travellers') { s.travellers = Math.min(8, Math.max(1, +t.value || 1)); return saveS(); }
  if (t.id === 'base') { const b = BASES[+t.value]; s.base = t.value === '' ? undefined : b; return saveS(); }
});

boot().catch((err) => { console.error(err); toast('Couldn’t load places – check your connection'); });
