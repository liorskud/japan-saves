# Japan Saves

A phone-first travel map of saved Instagram places in Japan: a live map, filters, a traveller profile, guides, an FX rate checker, and shared maps.

- **Stack:** Vite + TypeScript, MapLibre GL with OpenFreeMap tiles (no API key), Supabase (auth, sync, sharing), Wikimedia Commons photos.
- **Data:** `scripts/build_data.py` builds `public/data/japan.json`.
- **Deploy:** GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.

```sh
npm ci && npm run dev
```
