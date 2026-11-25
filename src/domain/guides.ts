/**
 * Guide content. Facts were checked on 2026-11-26; each section lists its sources.
 * Prices change – every page tells the reader to confirm on the official site before buying.
 */
export interface GuideLink { label: string; url: string }
export interface GuideSection { h: string; body: string[]; links?: GuideLink[] }
export interface Guide { id: string; icon: string; title: string; teaser: string; checked: string; sections: GuideSection[]; sources: GuideLink[] }

export const GUIDES: Guide[] = [
  {
    id: 'internet', icon: '📶', title: 'Internet & eSIM', teaser: 'Which eSIM to buy, how much data you need, and when you need a real phone number.', checked: '2026-11-26',
    sections: [
      { h: 'Pick by how you use your phone', body: [
        'Use the planner above: it turns days × daily use into total data and recommends fixed-data or unlimited.',
        'All the big providers run on Japanese networks (KDDI/au, SoftBank, NTT Docomo). Docomo has the strongest rural coverage – it matters for the Alps, Kamikochi and the Tango Peninsula (Ine).',
        'Holafly’s “unlimited” limits hotspot sharing to 500 MB a day – pick Ubigi or a fixed-data plan if you will tether a laptop or a friend.',
        'Most eSIMs are data-only: calls and SMS go through WhatsApp/FaceTime. If you need a Japanese number (some restaurant bookings, deliveries), take a voice SIM like Mobal or Sakura Mobile.',
        'Install the eSIM at home on Wi-Fi, switch it on when you land. Check your phone is carrier-unlocked first.'] },
      { h: 'Typical prices (late 2026)', body: [
        '7 days unlimited: about $19–$28 (Sim Local, Ubigi $25, Airalo, Saily, Holafly ~$27.50).',
        'Short stopover: 1 GB for 3 days from about $3.50–$4; 1 day unlimited about $4.',
        'Pocket Wi-Fi rental is still an option for a group sharing one device, but costs more and needs charging.'] },
    ],
    sources: [
      { label: 'TalkAndroid – 6 Japan eSIM providers compared', url: 'https://www.talkandroid.com/535448-best-esim-for-japan-in-2027-6-providers-compared-plans/' },
      { label: 'Japan Wireless – comparison chart (Jun 2026)', url: 'https://www.japan-wireless.com/esim/compare/japan-esim-comparison' },
      { label: 'Freaking Nomads – networks & hotspot caps', url: 'https://freakingnomads.com/best-esims-for-japan/' },
    ],
  },
  {
    id: 'transport', icon: '🚄', title: 'Getting around', teaser: 'IC cards, Shinkansen, JR Pass, buses, taxis and when each wins.', checked: '2026-11-26',
    sections: [
      { h: 'In cities: IC card', body: [
        'Add Suica or PASMO to Apple Wallet before you fly (iPhone) and top up with your card – it works on trains, metro, buses, convenience stores and many vending machines across Japan.',
        'Tap in and out at every gate. Fares are distance-based; most city rides are ¥170–¥300.',
        'Taxis: start around ¥500, roughly ¥100 per 250 m in Tokyo, +20% from 22:00 to 05:00. Use the GO or Uber app to call one; doors open automatically – don’t touch them.'] },
      { h: 'Between cities: Shinkansen, JR Pass, highway bus', body: [
        'Shinkansen is fastest for 100–800 km (Tokyo–Kyoto about 2 h 15 m). Book seats on the official smartEX app (Tokaido/Sanyo) or JR-East’s site.',
        'JR Pass 7/14/21 days: ¥50,000 / ¥80,000 / ¥100,000 when bought on the official JR Pass online service; overseas agencies charge ¥53,000 / ¥84,000 / ¥105,000 since Oct 1, 2026. It pays off only with several long trips – a Tokyo–Kyoto round trip is about ¥28,000.',
        'The JR Pass does not cover Nozomi/Mizuho trains without a surcharge, or city subways and private railways.',
        'Highway buses are the cheapest long-distance option; night buses save a hotel night.'] },
      { h: 'Domestic flights', body: [
        'Worth it for Tokyo ⇄ Fukuoka/Kyushu, Sapporo or Okinawa. LCCs (Peach, Jetstar Japan, Zipair, Spring Japan) are cheapest; ANA/JAL include baggage.',
        'Add about 2–3 hours for getting to the airport and security; Haneda is much closer to central Tokyo than Narita.'] },
      { h: 'How the app recommends', body: [
        'Each place shows walking, train, bus, taxi, Shinkansen, highway bus, car and flight where they make sense, with time and per-person cost from your base (set it in Settings).',
        'Your travel style in Settings weighs time against money: “cheapest” favours trains and buses, “comfort” favours taxis and Shinkansen. Estimates are approximate – use the Google Maps button for the exact route.'] },
    ],
    sources: [
      { label: 'JR Group – Japan Rail Pass price changes (Apr 9, 2026)', url: 'https://global.jr-central.co.jp/en/news/_pdf/2026/0001.pdf' },
      { label: 'JRPass.com – price history', url: 'https://www.jrpass.com/blog/jr-pass-price-history-how-much-the-pass-has-changed?c=USD' },
    ],
  },
  {
    id: 'driving', icon: '🚗', title: 'Driving licence & car rental', teaser: 'Israelis need a 1949-format International Driving Permit – get it before you fly.', checked: '2026-11-26',
    sections: [
      { h: 'What Japan accepts', body: [
        'Only International Driving Permits issued under the 1949 Geneva Convention are valid in Japan; 1968 Vienna-format permits are not.',
        'Israel issues both formats – ask explicitly for the 1949 one. It can only be issued in Israel, not at the embassy in Tokyo.',
        'The Israeli licence alone is not accepted. Carry the IDP together with your Israeli licence and passport.',
        'You can drive on an IDP for up to one year from entering Japan.'] },
      { h: 'On the road', body: [
        'Japan drives on the left. Expressway tolls are high – rent an ETC card with the car.',
        'Useful for Ine, the Tango Peninsula, rural Hokkaido and Kyushu; skip it in Tokyo, Osaka and Kyoto.'] },
    ],
    sources: [
      { label: 'Tokyo Metropolitan Police – valid IDPs (PDF)', url: 'https://www.keishicho.metro.tokyo.lg.jp/multilingual/english/traffic_safety/drivers_licenses/index.files/kokusaimenkyo_english.pdf' },
      { label: 'Embassy of Israel in Japan – travel tips', url: 'https://new.embassies.gov.il/japan/en/node/5991' },
      { label: 'IDP info – Israel (1949 & 1968)', url: 'https://internationaldrivingpermit.org/country/israel/' },
      { label: 'JAF – driving in Japan', url: 'https://english.jaf.or.jp/use-jaf-more/drive-in-japan' },
    ],
  },
  {
    id: 'entry', icon: '🛂', title: 'Entry, forms & taxes', teaser: 'Visit Japan Web, the ¥3,000 departure tax, the new tax-free refund, and JESTA.', checked: '2026-11-26',
    sections: [
      { h: 'Before you fly', body: [
        'Israeli passport holders can visit visa-free for short stays (check your passport is valid for the whole trip).',
        'Fill in Visit Japan Web before landing: it gives QR codes for immigration and customs and speeds up tax-free shopping.',
        'JESTA, Japan’s future electronic travel authorisation, became law in 2026 but is planned to start in fiscal year 2028 – not needed yet.'] },
      { h: 'Money you’ll pay on the way', body: [
        'International Tourist (departure) Tax: ¥3,000 per departure since July 1, 2026 – usually already inside your air ticket.',
        'Some cities add hotel taxes per night (Kyoto raised its rates in 2026).'] },
      { h: 'Tax-free shopping changed on Nov 1, 2026', body: [
        'You now pay the full price including 10% consumption tax in the shop, then get the tax refunded after customs confirms the goods at departure.',
        'Show your passport (or the Visit Japan Web code where accepted) when buying; leave within 90 days of purchase; visit the customs refund point at the airport before check-in.'] },
    ],
    sources: [
      { label: 'Japan Tourism Agency – departure tax (PDF)', url: 'https://www.mlit.go.jp/kankocho/content/001996466.pdf' },
      { label: 'Japan Tourism Agency – tax-free Refund Method', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00028.html' },
      { label: 'JNTO – new tax-free system', url: 'https://www.japan.travel/en/us/blog/everything-you-need-to-know-japans-new-tax-free-shopping-system/' },
      { label: 'JESTA timeline', url: 'https://www.visa-requirements.io/blog/jesta-japan-2026-do-you-need-it/' },
    ],
  },
  {
    id: 'money', icon: '💴', title: 'Money & exchange', teaser: 'Live rates, and a 0–10 score for any exchange offer you get.', checked: '2026-11-26',
    sections: [
      { h: 'Cards and cash', body: [
        'Cards work in most cities, but small restaurants, temples and street stalls are often cash-only – keep ¥10,000–¥20,000 on you.',
        '7-Eleven and Japan Post ATMs accept foreign cards. Always choose to be charged in yen, never in shekels (“dynamic currency conversion” costs 3–8%).',
        'A multi-currency card (e.g. Revolut, Wise, or your bank’s travel card) usually beats exchange offices.'] },
      { h: 'How the score works', body: [
        'Enter the rate you are offered; it is compared with the European Central Bank mid-market rate. Score 10 = within 0.5% of mid-market, 7 ≈ 3% margin (a good exchange office), 5 ≈ 5%, 2 ≈ 8%, 0 = 10% or worse (walk away).',
        'Rates are daily ECB reference rates, so a 0.5–1% gap from your bank app’s live rate is normal.'] },
    ],
    sources: [{ label: 'Frankfurter API – ECB reference rates', url: 'https://www.frankfurter.app/docs/' }],
  },
];

/** eSIM planner: picks a recommendation from trip length and usage. Prices are late-2026 typical values. */
export function planEsim(days: number, usage: 'light' | 'normal' | 'heavy', hotspot: boolean, needNumber: boolean, rural: boolean) {
  const perDay = { light: 0.5, normal: 1.5, heavy: 3.5 }[usage];
  const total = Math.ceil(days * perDay);
  const recs: { name: string; why: string; url: string }[] = [];
  if (needNumber) recs.push({ name: 'Mobal or Sakura Mobile (voice SIM)', why: 'Includes a Japanese phone number for bookings and calls.', url: 'https://www.mobal.com/' });
  if (total > 12 || usage === 'heavy') {
    recs.push({ name: 'Ubigi unlimited', why: `About $25 for 8 days. Docomo/KDDI networks${rural ? ' – best rural coverage' : ''}, hotspot allowed.`, url: 'https://cellulardata.ubigi.com/' });
    if (!hotspot) recs.push({ name: 'Holafly unlimited', why: 'Simple unlimited for one phone (~$27.50 / 7 days); hotspot capped at 500 MB/day.', url: 'https://esim.holafly.com/' });
  } else {
    recs.push({ name: `Saily or Airalo – ${total <= 3 ? 3 : total <= 5 ? 5 : total <= 10 ? 10 : 20} GB plan`, why: `You need about ${total} GB. Fixed-data plans are cheapest for this.${rural ? ' Note: SoftBank/KDDI coverage thins out in mountains.' : ''}`, url: 'https://saily.com/' });
    if (rural) recs.push({ name: 'Ubigi fixed data', why: 'Uses Docomo/KDDI – stronger in rural areas.', url: 'https://cellulardata.ubigi.com/' });
  }
  return { total, perDay, recs };
}
