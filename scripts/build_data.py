"""Builds public/data/japan.json from the v1 places, OpenStreetMap lookups, Commons photos and researched fields.
Run: python3 scripts/build_data.py
Sources per place are kept in `sources` so every fact can be traced."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
v1 = json.load(open(ROOT / 'places-v1.json'))
photos = json.load(open(ROOT / 'photos.json'))

# Dish photos (not taken at the venue) are labelled so they are never mistaken for the place itself.
DISH_EXAMPLE = {'maguro-mart', 'ikura-shibuya', 'marushichi-ginza', 'gyoza-ro', 'hanayama-udon', 'yagura-hakata', 'kappo-shishikura', 't-nakameguro'}
AREA_PHOTO = {'ohno-kamakura', 'ramen-mozu', 'yurakucho-kakida', 'kitan-hibiki', 'bar-centifolia', 'chopsticks-studio', 'shunyacchan'}

OSM = 'OpenStreetMap (Nominatim), checked 2026-11-26'

# Per-place additions: address (EN + JA for taxi drivers), corrected coordinates, booking, phone, web, yen spend, about.
E = {
 'age3-asakusa': dict(addressEn='2-7-22 Asakusa, Taito-ku, Tokyo', addressJa='東京都台東区浅草2-7-22', yen=[400, 900], booking='no',
   arriveBasis='estimate', about='Tiny stand frying brioche sandwiches filled with whipped cream or custard – crisp outside, cold cream inside. Takeaway snack, eat on the street nearby.'),
 'ohno-kamakura': dict(addressEn='2-2-16 Komachi, Kamakura, Kanagawa', addressJa='神奈川県鎌倉市小町2-2-16', yen=[2000, 4000], booking='recommended', bookingHow='TableCheck (search "Roast Beef Ohno Kamakura")',
   arriveBasis='estimate', about='Rare roast-beef bowl piled high with thin wagyu slices and a raw yolk, on Komachi-dori shopping street by Kamakura Station. Easy lunch on a Kamakura day trip.'),
 'ramen-mozu': dict(addressEn='Akasaka Biz Tower B1F, 5-3-1 Akasaka, Minato-ku, Tokyo', addressJa='東京都港区赤坂5-3-1 赤坂Bizタワー B1F', yen=[1100, 1600], booking='no',
   arriveBasis='opening', about='Clear, light chicken-salt ramen in an office-tower basement food floor – quick counter meal, good near Akasaka hotels.'),
 'sushi-yoshikawa': dict(addressEn='Azabu-Juban, Minato-ku, Tokyo (confirm branch when booking)', yen=[12000, 20000], booking='required', bookingHow='Online booking (Omakase / restaurant site)',
   arriveBasis='post', about='Creative sushi counter known for the "Dragon Ball" roll – fatty tuna and sea urchin rolled into a sphere. Course-only dinner.'),
 'marushichi-ginza': dict(yen=[1500, 2500], booking='no', arriveBasis='opening', diet=dict(pork=True),
   about='Huge, thick pork-cutlet rice bowl simmered in egg and dashi – a heavy, old-school lunch. Pork only.'),
 'kitan-hibiki': dict(addressEn='1-1-7 Namba, Chuo-ku, Osaka', addressJa='大阪府大阪市中央区難波1-1-7', yen=[3000, 5000], booking='recommended', bookingHow='Seat reservation on the restaurant\'s booking page',
   arriveBasis='post', about='Dry-aged wagyu burger with a crispy potato layer, near Dotonbori. Evenings it turns into a steak restaurant.'),
 'labysse-osaka': dict(addressEn='Four Seasons Hotel Osaka 37F, Dojima 2-chome, Kita-ku, Osaka', addressJa='大阪府大阪市北区堂島2丁目 フォーシーズンズホテル大阪 37階',
   lat=34.6959, lng=135.4936, yen=[26600, 38000], booking='required', bookingHow='Four Seasons Osaka dining reservations', website='https://www.fourseasons.com/jp/osaka/',
   arriveBasis='post', diet=dict(pork=False, shellfish=True, noPorkOption=True), sources=[OSM],
   about='Yannick Alléno\'s omakase sushi counter on the 37th floor with city views. The 17:30 sunset seating is the cheaper and more scenic slot. Not kosher; no-pork/no-shellfish on request when booking.'),
 'benitsuru': dict(addressEn='2-1-11 Nishi-Asakusa, Taito-ku, Tokyo', addressJa='東京都台東区西浅草2-1-11', lat=35.7119, lng=139.7918, yen=[2000, 3500], booking='required',
   bookingHow='Same-day numbered ticket at the door from 8:30 (¥1,000 deposit) – no online booking', arriveBasis='post', diet=dict(pork=True), sources=[OSM],
   about='Famous soufflé-style triple-stack pancakes (the bacon-and-egg one is the signature). Tickets for the day sell out early – go at 8:30 to get a slot.'),
 't-nakameguro': dict(addressEn='Comfort Nakameguro 102, 2-37-12 Kamimeguro, Meguro-ku, Tokyo', addressJa='東京都目黒区上目黒2-37-12 コンフォート中目黒102', yen=[18000, 25000], booking='required',
   bookingHow='Online reservation (course only; cancellation fees)', arriveBasis='post',
   about='Steak tasting course built around a huge Omi-beef T-bone. Everyone starts at the same time – arrive on the minute.'),
 'tsukiji': dict(addressEn='4-chome Tsukiji, Chuo-ku, Tokyo', addressJa='東京都中央区築地4丁目 築地場外市場', lat=35.6654, lng=139.7705, yen=[1500, 4000], booking='no',
   website='https://www.tsukiji.or.jp/', arriveBasis='opening', sources=[OSM],
   about='Old outer market streets with stalls selling tamagoyaki, tuna, uni, grilled scallops and knives. Graze from stall to stall in the morning; many close by early afternoon.'),
 'yagura-hakata': dict(addressEn='B1, 2-9-28 Hakataekimae, Hakata-ku, Fukuoka', addressJa='福岡県福岡市博多区博多駅前2-9-28 B1', yen=[900, 1500], booking='no', arriveBasis='post', diet=dict(pork=True),
   about='50-year-old basement counter where the old chef makes katsudon in front of you; add the udon set. Lunch crowd of office workers.'),
 'ginza-kagari': dict(addressEn='6-4-12 Ginza, Chuo-ku, Tokyo', addressJa='東京都中央区銀座6-4-12', yen=[1200, 3000], booking='no', arriveBasis='post',
   about='Creamy chicken paitan ramen – rich, silky broth, the dish that made this tiny alley shop famous. Expect a line.'),
 'kappo-shishikura': dict(addressEn='Ebisu, Shibuya-ku, Tokyo (exact address: check booking page)', yen=[8000, 18000], booking='required', bookingHow='TableCheck', arriveBasis='post',
   about='Premium bluefin tuna bowls (lean, medium-fatty and fatty in one bowl), plus a tuna-and-uni "Emperor" bowl.'),
 'maguro-mart': dict(addressEn='Arai 1-chome (Yakushi Ai-Road shopping street), Nakano-ku, Tokyo', addressJa='東京都中野区新井1丁目 薬師あいロード商店街 マグロマート',
   lat=35.7105, lng=139.6664, phone='+81-3-5942-5594', yen=[4000, 8000], booking='required', bookingHow='Phone or online; book about a month ahead', arriveBasis='post', sources=[OSM],
   notes='Hours differ between the post (Mon–Fri 17–22, Sat–Sun 16–23) and OpenStreetMap (Mon–Sat 17–24, Sun 16–23:30). Confirm when booking.',
   about='Small tuna-only restaurant with rare cuts you rarely see elsewhere – scraped bone meat (nakaochi), seasonal chef specials.'),
 'yurakucho-kakida': dict(addressEn='Odakyu Southern Tower 19F, 2-2-1 Yoyogi, Shibuya-ku, Tokyo', addressJa='東京都渋谷区代々木2-2-1 小田急サザンタワー19階', yen=[13000, 15000], booking='required',
   bookingHow='Online – seatings often full months ahead', arriveBasis='post',
   about='All-you-can-eat omakase sushi with Toyosu-market fish, served in timed seatings. A one-drink minimum applies.'),
 'shunyacchan': dict(addressEn='Hatsuzawa-machi, Hachioji, Tokyo (near Takao Station)', addressJa='東京都八王子市初沢町 屋台ラーメン しゅんやっちゃん', lat=35.6414, lng=139.2858,
   hours='18:00–23:00', days='Tue–Sat (closed Sun–Mon)', yen=[900, 1300], booking='recommended', bookingHow='TableCheck', website='https://tabelog.com/tokyo/A1329/A132905/13256299/',
   arriveBasis='opening', sources=[OSM], about='Street-stall style ramen with Hachioji\'s chopped-onion shoyu soup. Far west of central Tokyo – combine with a Mt. Takao hike.'),
 'ikura-shibuya': dict(addressEn='Dogenzaka 1-chome, Shibuya-ku, Tokyo', addressJa='東京都渋谷区道玄坂1丁目 いくら', lat=35.6569, lng=139.6956, yen=[1500, 2500], booking='unknown',
   arriveBasis='estimate', sources=[OSM], about='Omurice and hamburg steak cooked on a sizzling hot plate in front of you – fun, filling, casual.'),
 'hanayama-udon': dict(addressEn='3-14-13 Ginza, Chuo-ku, Tokyo (behind Kabukiza)', addressJa='東京都中央区銀座3-14-13', yen=[1000, 2000], booking='no', arriveBasis='opening',
   about='Gunma-style "himokawa" udon – noodles as wide as a ribbon, served hot or cold. Long queues at the Ginza branch.'),
 'gyoza-ro': dict(addressEn='6-2-4 Jingumae, Shibuya-ku, Tokyo', addressJa='東京都渋谷区神宮前6-2-4', lat=35.6676, lng=139.7062, yen=[600, 1200], booking='no', arriveBasis='estimate', diet=dict(pork=True), sources=[OSM],
   about='Cheap, fast gyoza – pan-fried or steamed, with or without garlic – a classic quick stop between Harajuku shops.'),
 'hikiniku-kyoto': dict(addressEn='363 Kiyomotocho, Higashiyama-ku, Kyoto', addressJa='京都府京都市東山区清本町363', lat=35.0051, lng=135.7745, yen=[1800, 2500], booking='recommended',
   bookingHow='Free online slots 7 days ahead, or same-day registration in store from 9:00', bookingUrl='https://hikinikutocome.com/', website='https://hikinikutocome.com/', arriveBasis='post', sources=[OSM],
   about='Hamburg steaks grilled over charcoal and served one at a time, straight to your rice bowl. Strict time slots.'),
 'bar-centifolia': dict(addressEn='Azabu-Juban 1-chome, Minato-ku, Tokyo', addressJa='東京都港区麻布十番1丁目 バー センティフォリア', lat=35.6564, lng=139.7342, phone='+81-3-3478-6228',
   yen=[8000, 15000], arriveBasis='opening', booking='recommended', sources=[OSM],
   about='Theatrical cocktail bar where drinks arrive like performances, with a welcome glass of champagne. Popular with visitors – book or arrive at opening.'),
 'ine-funaya': dict(addressEn='Hiji, Ine-cho, Yosa-gun, Kyoto', addressJa='京都府与謝郡伊根町日出', lat=35.6749, lng=135.2894, yen=[0, 1500], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Fishing village of wooden boathouses (funaya) built right on the water. Quiet, scenic, best seen from the short sightseeing boat.'),
 'chureito': dict(addressEn='Arakura, Fujiyoshida, Yamanashi', addressJa='山梨県富士吉田市新倉 忠霊塔', lat=35.5013, lng=138.8014, yen=[0, 0], booking='no', arriveBasis='estimate', sources=[OSM],
   about='The postcard view: a five-storey red pagoda in front of Mt. Fuji, reached by 398 steps. Clear mornings are everything here.'),
 'fujiq-naruto': dict(addressEn='5-6-1 Shin-Nishihara, Fujiyoshida, Yamanashi', addressJa='山梨県富士吉田市新西原5-6-1 富士急ハイランド', lat=35.4873, lng=138.7816, phone='+81-555-23-2111',
   website='https://www.fujiq.jp/', yen=[6000, 8000], booking='recommended', arriveBasis='opening', sources=[OSM],
   about='Big thrill-ride park at the foot of Fuji with a Naruto/Boruto "Hidden Leaf Village" area – character meets, Ichiraku ramen, anime props.'),
 'nijigen-naruto': dict(addressEn='Kusumoto, Awaji City, Hyogo (Awaji Island)', addressJa='兵庫県淡路市楠本 ニジゲンノモリ', lat=34.5748, lng=135.0021, phone='+81-799-64-7061',
   website='https://nijigennomori.com/', bookingUrl='https://nijigennomori.com/', yen=[3300, 6000], booking='recommended', arriveBasis='opening', sources=[OSM],
   about='Outdoor Naruto ninja park on Awaji Island: complete missions by performing jutsu hand signs that sensors recognise to open doors and chests.'),
 'matsumoto-castle': dict(addressEn='4-1 Marunouchi, Matsumoto, Nagano', addressJa='長野県松本市丸の内4-1 松本城', lat=36.2386, lng=137.9689, website='https://www.matsumoto-castle.jp/',
   hours='8:30–17:00 (8:00–18:00 Golden Week and August)', yen=[700, 700], booking='no', arriveBasis='opening', sources=[OSM],
   about='One of Japan\'s few original castles – black "crow castle" with steep wooden stairs inside. Climb to the top for Alps views.'),
 'daio-wasabi': dict(addressEn='Hotaka, Azumino, Nagano', addressJa='長野県安曇野市穂高 大王わさび農場', lat=36.3387, lng=137.9084, yen=[0, 1000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Huge wasabi farm with crystal-clear spring-water channels and old water wheels. Free to walk; try the wasabi soft-serve.'),
 'nakasendo': dict(addressEn='Magome, Nakatsugawa, Gifu', addressJa='岐阜県中津川市馬籠 馬籠宿', lat=35.5265, lng=137.5675, website='https://kiso-magome.com/', yen=[0, 1500], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Walk the preserved Edo-era post road between two old wooden post towns through forest and waterfalls – about 8 km, mostly downhill from Magome.'),
 'kamikochi': dict(addressEn='Kappa Bridge, Azumi, Matsumoto, Nagano', addressJa='長野県松本市安曇 上高地 河童橋', lat=36.2488, lng=137.6378, yen=[2500, 5000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Alpine valley with a turquoise river and the Hotaka peaks. Flat riverside walks from Kappa Bridge – no private cars, bus or taxi only.'),
 'takayama': dict(addressEn='Kami-Sannomachi, Takayama, Gifu', addressJa='岐阜県高山市上三之町', lat=36.1417, lng=137.2595, yen=[1000, 5000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Lanes of dark wooden merchant houses, sake breweries and Hida-beef snack stalls, plus riverside morning markets.'),
 'beppu': dict(addressEn='Umi Jigoku, Kannawa, Beppu, Oita', addressJa='大分県別府市鉄輪 海地獄', lat=33.3159, lng=131.4697, yen=[2200, 6000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Steaming "hells" – boiling cobalt-blue and blood-red hot-spring pools – plus endless public baths in Japan\'s hot-spring capital.'),
 'sensoji': dict(addressEn='2-3-1 Asakusa, Taito-ku, Tokyo', addressJa='東京都台東区浅草2-3-1 浅草寺', lat=35.7134, lng=139.7955, phone='+81-3-3842-0181', website='https://senso-ji.jp',
   hours='Main hall 6:00–17:00 (from 6:30 Oct–Mar); grounds always open', yen=[0, 1500], booking='no', arriveBasis='opening', sources=[OSM],
   about='Tokyo\'s oldest temple: the giant red lantern gate, the Nakamise snack street and the incense-filled main hall.'),
 'chopsticks-studio': dict(addressEn='1-5-4 Kabukicho, Shinjuku-ku, Tokyo', addressJa='東京都新宿区歌舞伎町1-5-4', yen=[2000, 3000], booking='required', bookingHow='Klook (code LOCALOU from the post)', arriveBasis='post',
   about='Hands-on workshop: shape, sand and finish your own pair of chopsticks, then get them laser-engraved. A souvenir you made.'),
 'cat-street': dict(addressEn='Jingumae 6-chome, Shibuya-ku, Tokyo', addressJa='東京都渋谷区神宮前6丁目 キャットストリート', lat=35.6659, lng=139.7051, yen=[3000, 20000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Car-free back street between Harajuku and Shibuya lined with streetwear, vintage and concept stores.'),
 'uniqlo-ginza': dict(addressEn='6-9-5 Ginza, Chuo-ku, Tokyo', addressJa='東京都中央区銀座6-9-5', yen=[2000, 10000], booking='no', arriveBasis='estimate',
   about='Uniqlo\'s 12-floor global flagship with Japan-only lines and custom printing.'),
 'shimokitazawa': dict(addressEn='Kitazawa, Setagaya-ku, Tokyo (Shimokitazawa Station)', addressJa='東京都世田谷区北沢2丁目 下北沢駅', lat=35.6613, lng=139.6669, yen=[1000, 8000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Laid-back neighbourhood of vintage clothing shops, record stores, small cafés and live houses.'),
 'kichijoji': dict(addressEn='Inokashira Park, Mitaka / Musashino, Tokyo', addressJa='東京都三鷹市 井の頭恩賜公園', lat=35.6989, lng=139.5787, yen=[0, 2000], booking='no', arriveBasis='estimate', sources=[OSM],
   about='Leafy pond park with swan boats next to Kichijoji\'s shopping streets – a calm local half-day. The Ghibli Museum is a short walk.'),
}

BOOK_MAP = {'Required': 'required', 'No': 'no'}

out = []
for p in v1['places']:
    e = E.get(p['id'], {})
    q = {**p, **{k: v for k, v in e.items() if k not in ('sources',)}}
    q['sources'] = ['Instagram post caption'] + e.get('sources', [])
    ph = photos.get(p['id'], [])
    for x in ph:
        x['kind'] = 'dish' if p['id'] in DISH_EXAMPLE else ('area' if p['id'] in AREA_PHOTO else 'place')
    q['photos'] = ph[:2]
    if 'yen' in q and q['yen'] == [0, 0]:
        q['yen'] = [0, 0]
    out.append(q)

data = {
    'updated': '2026-11-26',
    'priceScale': v1['priceScale'],
    'places': out,
    'review': v1['review'],
}
dst = ROOT.parent / 'public' / 'data' / 'japan.json'
json.dump(data, open(dst, 'w'), ensure_ascii=False, indent=1)
missing = [p['id'] for p in out if not p.get('addressEn')]
print(len(out), 'places ->', dst, '| no address:', missing, '| no photos:', [p['id'] for p in out if not p['photos']])
