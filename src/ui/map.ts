/// <reference types="geojson" />
import maplibregl, { type GeoJSONSource, type Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Place, MarkStatus } from '../domain/types';
import { CATS } from '../domain/rules';

/** Live vector map (OpenFreeMap tiles, no API key) with clustered category pins. */
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

let map: MLMap;
let ready = false;
let pending: { places: Place[]; marks: Record<string, MarkStatus> } | null = null;
let onPick: (id: string) => void = () => {};

const dark = () => matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light';

export function initMap(el: HTMLElement, pick: (id: string) => void) {
  onPick = pick;
  map = new maplibregl.Map({
    container: el,
    style: dark() ? STYLE.dark : STYLE.light,
    center: [137.5, 36.2],
    zoom: 4.6,
    attributionControl: { compact: true },
    cooperativeGestures: false,
  });
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  map.on('load', () => {
    map.addSource('places', { type: 'geojson', data: empty(), cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
    map.addLayer({ id: 'clusters', type: 'circle', source: 'places', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#c8382a', 'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 25], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'places', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#fff' } });
    map.addLayer({ id: 'pins', type: 'circle', source: 'places', filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 7, 12, 10, 16, 13],
        'circle-stroke-color': ['match', ['get', 'mark'], 'want', '#c8382a', 'good', '#2f8a4c', 'bad', '#6f685c', '#ffffff'],
        'circle-stroke-width': ['match', ['get', 'mark'], 'none', 2, 4],
        'circle-opacity': ['match', ['get', 'mark'], 'bad', 0.45, 1],
      } });
    map.addLayer({ id: 'labels', type: 'symbol', source: 'places', filter: ['!', ['has', 'point_count']], minzoom: 12.5,
      layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'], 'text-max-width': 10 },
      paint: { 'text-color': dark() ? '#ebe6da' : '#1f1d1a', 'text-halo-color': dark() ? '#10141c' : '#ffffff', 'text-halo-width': 1.5 } });

    map.on('click', 'clusters', async (e) => {
      const f = e.features?.[0]; if (!f) return;
      const src = map.getSource('places') as GeoJSONSource;
      const z = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.5 });
    });
    map.on('click', 'pins', (e) => { const id = e.features?.[0]?.properties?.id; if (id) onPick(String(id)); });
    for (const l of ['clusters', 'pins']) {
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    }
    ready = true;
    if (pending) { setPlaces(pending.places, pending.marks); pending = null; }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => location.reload());
}

const empty = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] });

export function setPlaces(places: Place[], marks: Record<string, MarkStatus>) {
  if (!ready) { pending = { places, marks }; return; }
  (map.getSource('places') as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name, color: CATS[p.cat].hex, mark: marks[p.id] ?? 'none' },
    })),
  });
}

export function fitTo(places: Place[]) {
  if (!places.length) return;
  const b = new maplibregl.LngLatBounds();
  places.forEach((p) => b.extend([p.lng, p.lat]));
  map.fitBounds(b, { padding: { top: 150, bottom: 60, left: 40, right: 70 }, maxZoom: 15, duration: 600 });
}

export function flyTo(p: Place) { map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 15), duration: 700 }); }

export function locate(onErr: (m: string) => void) {
  if (!navigator.geolocation) return onErr('Location isn’t available on this device.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      new maplibregl.Marker({ color: '#2b4a7a' }).setLngLat(c).addTo(map);
      map.flyTo({ center: c, zoom: 14 });
    },
    () => onErr('Location permission was declined.'),
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export const resize = () => map?.resize();
