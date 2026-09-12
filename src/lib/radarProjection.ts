// PAGASA's official radar/map.js defines this mosaic in EPSG:4326.
// Extent order here is west, south, east, north (longitude, latitude).
export type RasterExtent = readonly [number, number, number, number];
export const PAGASA_RADAR_EXTENT: RasterExtent = [115.969111093, 3.80912641587, 129.511990464, 22.322581275];
export type DrawStrip = [number, number, number, number, number, number, number, number];

export function latitudeToWorldY(latitude: number, worldSize: number): number {
  const radians = latitude * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(radians)) / Math.PI) * worldSize / 2;
}

export function worldYToLatitude(y: number, worldSize: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / worldSize))) * 180 / Math.PI;
}

/** Inverse-map each destination Mercator pixel row into the geographic raster.
 * Longitude is linear in both projections; latitude is NOT. Whole-image
 * ImageOverlay stretching fixes only the corners and displaces interior rain.
 * Returns Canvas drawImage source/destination rectangles, clipped to the extent.
 */
export function geographicRasterTileStrips(
  coords: { x: number; y: number; z: number }, width: number, height: number,
  extent: RasterExtent = PAGASA_RADAR_EXTENT, tileSize = 256,
): DrawStrip[] {
  const [west, south, east, north] = extent;
  if (![width, height, tileSize, ...extent, coords.x, coords.y, coords.z].every(Number.isFinite)
    || width <= 0 || height <= 0 || tileSize <= 0 || west >= east || south >= north
    || south < -85.05112878 || north > 85.05112878 || west < -180 || east > 180
    || !Number.isInteger(coords.z) || coords.z < 0 || coords.z > 22) {
    throw new Error('Invalid geographic radar raster');
  }
  const world = tileSize * 2 ** coords.z;
  const originX = coords.x * tileSize;
  const originY = coords.y * tileSize;
  const left = (west + 180) / 360 * world;
  const right = (east + 180) / 360 * world;
  const top = latitudeToWorldY(north, world);
  const bottom = latitudeToWorldY(south, world);
  const dx = Math.max(0, left - originX);
  const endX = Math.min(tileSize, right - originX);
  const startY = Math.max(0, top - originY);
  const endY = Math.min(tileSize, bottom - originY);
  if (dx >= endX || startY >= endY) return [];

  const sx = (originX + dx - left) / (right - left) * width;
  const sw = (endX - dx) / (right - left) * width;
  const sourceY = (y: number) => Math.max(0, Math.min(height,
    (north - worldYToLatitude(originY + y, world)) / (north - south) * height));
  const strips: DrawStrip[] = [];
  for (let row = Math.floor(startY); row < Math.ceil(endY); row++) {
    const dy = Math.max(row, startY);
    const nextY = Math.min(row + 1, endY);
    const sy = sourceY(dy);
    const sh = sourceY(nextY) - sy;
    if (sh > 0) strips.push([sx, sy, sw, sh, dx, dy, endX - dx, nextY - dy]);
  }
  return strips;
}
