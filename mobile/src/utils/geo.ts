// Small helpers for the listing location step (no map SDK needed).

const TILE = 256;

// Web Mercator: the global pixel position of a coordinate at a zoom level.
export function toWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// The OpenStreetMap tiles needed to fill a `width` × `height` box centred on the
// coordinate, with each tile's position inside the box.
export function tilesAround(lat: number, lng: number, zoom: number, width: number, height: number) {
  const c = toWorldPixel(lat, lng, zoom);
  const left = c.x - width / 2;
  const top = c.y - height / 2;
  const max = 2 ** zoom;
  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      const wx = ((tx % max) + max) % max;
      tiles.push({ key: `${zoom}/${tx}/${ty}`, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`, left: tx * TILE - left, top: ty * TILE - top });
    }
  }
  return tiles;
}

export const isValidCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);

// Both empty (no pin) or both valid numbers.
export function coordProblem(latText: string, lngText: string): string | null {
  const a = latText.trim();
  const b = lngText.trim();
  if (!a && !b) return null;
  if (!a || !b) return 'Enter both latitude and longitude, or remove the location.';
  if (!isValidCoord(Number(a), Number(b))) return 'Latitude must be between -90 and 90 and longitude between -180 and 180.';
  return null;
}

// Geocoder query for the address the host typed.
export const addressQuery = (locality: string, city: string) => [locality.trim(), city.trim(), 'India'].filter(Boolean).join(', ');
