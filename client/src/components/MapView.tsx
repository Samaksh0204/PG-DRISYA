import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PropertyListing } from '../types';
import { formatINR } from '../lib/format';
import { optimizeImage } from '../lib/image';

// OpenStreetMap tiles: free, no API key. For heavy traffic, switch to a paid tile
// provider (MapTiler, Stadia, Mapbox) — see the OSM tile usage policy. OSM blocks
// tile requests without a Referer, so each tile sends our origin (never the page path).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_REFERRER = 'strict-origin-when-cross-origin';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

const hasCoords = (l: PropertyListing) => !!l.lat && !!l.lng;

// Airbnb-style price pill markers (no image assets needed). Cached per price so
// re-renders reuse the same icon instead of rebuilding marker DOM.
const iconCache = new Map<number, L.DivIcon>();
const priceIcon = (price: number) => {
  let icon = iconCache.get(price);
  if (!icon) {
    icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;align-items:center;justify-content:center;height:28px;white-space:nowrap;padding:0 10px;border-radius:999px;font:600 12px Inter,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.25);background:#fff;color:rgb(var(--ink-900));border:1px solid rgb(var(--ink-200))">${formatINR(price)}</div>`,
      iconSize: [84, 28],
      iconAnchor: [42, 14],
    });
    iconCache.set(price, icon);
  }
  return icon;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export function ListingsMap({ listings, onSelect, className = 'h-[70vh]' }: { listings: PropertyListing[]; onSelect: (id: string) => void; className?: string }) {
  const located = useMemo(() => listings.filter(hasCoords), [listings]);
  const points = useMemo(() => located.map((l) => [l.lat, l.lng] as [number, number]), [located]);
  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-700 ${className}`}>
      <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} referrerPolicy={TILE_REFERRER} />
        <FitBounds points={points} />
        {located.map((l) => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={priceIcon(l.price)}>
            <Popup>
              <button onClick={() => onSelect(l.id)} className="block w-48 text-left">
                {l.photos[0] && <img src={optimizeImage(l.photos[0], 240)} alt="" loading="lazy" decoding="async" className="mb-2 h-24 w-full rounded-lg object-cover" />}
                <span className="block text-sm font-semibold">{l.title}</span>
                <span className="block text-xs text-gray-500">{l.locality}, {l.city}</span>
                <span className="mt-1 block text-sm font-bold">{formatINR(l.price)}/month</span>
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {located.length < listings.length && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs text-ink-600 shadow">
          {listings.length - located.length} listing{listings.length - located.length > 1 ? 's' : ''} without a map pin not shown
        </div>
      )}
    </div>
  );
}

// Approximate area only (like Airbnb) — exact address is shared after booking.
export function ListingLocationMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  if (!lat || !lng) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-ink-200 text-sm text-ink-500 dark:border-ink-700">
        {label}
      </div>
    );
  }
  return (
    <div className="relative isolate z-0 h-72 overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-700">
      <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} referrerPolicy={TILE_REFERRER} />
        <Circle center={[lat, lng]} radius={400} pathOptions={{ color: 'rgb(20 184 166)', fillColor: 'rgb(20 184 166)', fillOpacity: 0.15 }} />
      </MapContainer>
    </div>
  );
}
