import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geographicRasterTileStrips, PAGASA_RADAR_EXTENT, latitudeToWorldY, worldYToLatitude } from './radarProjection.ts';

const [west, south, east, north] = PAGASA_RADAR_EXTENT;
const width = 1600;
const height = 2200;
// Independent standard slippy-map equations, not the implementation helpers.
const worldPoint = (lat: number, lon: number, z: number) => {
  const size = 256 * 2 ** z;
  return [(lon + 180) / 360 * size,
    (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * size];
};

test('old corner-only image stretch displaces interior rain by about 20 km', () => {
  let maxKm = 0;
  for (let i = 0; i <= 1000; i++) {
    const fraction = i / 1000;
    const actualLat = north - fraction * (north - south);
    const stretchedY = latitudeToWorldY(north, 1) * (1 - fraction) + latitudeToWorldY(south, 1) * fraction;
    maxKm = Math.max(maxKm, Math.abs(worldYToLatitude(stretchedY, 1) - actualLat) * 111.195);
  }
  assert(maxKm > 19 && maxKm < 21, `${maxKm} km`);
});

test('known PH locations sample the right raster coordinates at every supported zoom', () => {
  const locations = [[14.5995, 120.9842], [10.3157, 123.8854], [7.1907, 125.4553],
    [18.2, 120.6], [14.03, 122], [4.5, 119], [21.5, 122], [9.74, 118.74]];
  for (let z = 3; z <= 10; z++) {
    for (const [lat, lon] of locations) {
      const [wx, wy] = worldPoint(lat, lon, z);
      const coords = { x: Math.floor(wx / 256), y: Math.floor(wy / 256), z };
      const strips = geographicRasterTileStrips(coords, width, height);
      const x = wx - coords.x * 256;
      const y = wy - coords.y * 256;
      const strip = strips.find(([, , , , dx, dy, dw, dh]) => x >= dx && x <= dx + dw && y >= dy && y <= dy + dh);
      assert(strip, `missing ${lat},${lon} z${z}`);
      const [sx, sy, sw, sh, dx, dy, dw, dh] = strip;
      const actualLon = west + (sx + (x - dx) / dw * sw) / width * (east - west);
      const actualLat = north - (sy + (y - dy) / dh * sh) / height * (north - south);
      assert(Math.abs(actualLon - lon) < 1e-9);
      // Sub-pixel row interpolation only; <100 m even at z3, <1 m at z7+.
      assert(Math.abs(actualLat - lat) * 111195 < (z >= 7 ? 1 : 100), `latitude drift z${z}`);
    }
  }
});

test('all source/destination rectangles are clipped, ordered, contiguous and nonempty', () => {
  for (const z of [3, 5, 7]) {
    const [minX, minY] = worldPoint(north, west, z).map(p => Math.floor(p / 256));
    const [maxX, maxY] = worldPoint(south, east, z).map(p => Math.floor(p / 256));
    for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
      const strips = geographicRasterTileStrips({ x, y, z }, width, height);
      assert(strips.length <= 256);
      for (let i = 0; i < strips.length; i++) {
        const [sx, sy, sw, sh, dx, dy, dw, dh] = strips[i];
        assert(sx >= -1e-9 && sy >= 0 && sw > 0 && sh > 0);
        assert(sx + sw <= width + 1e-8 && sy + sh <= height + 1e-8);
        assert(dx >= 0 && dy >= 0 && dw > 0 && dh > 0 && dh <= 1);
        assert(dx + dw <= 256 && dy + dh <= 256);
        if (i) {
          const previous = strips[i - 1];
          assert(Math.abs(previous[1] + previous[3] - sy) < 1e-8);
          assert(Math.abs(previous[5] + previous[7] - dy) < 1e-8);
        }
      }
    }
  }
});

test('neighboring tiles meet at the same geographic image row', () => {
  const top = geographicRasterTileStrips({ x: 107, y: 59, z: 7 }, width, height);
  const bottom = geographicRasterTileStrips({ x: 107, y: 60, z: 7 }, width, height);
  assert(top.length && bottom.length);
  const last = top.at(-1)!;
  assert(Math.abs(last[1] + last[3] - bottom[0][1]) < 1e-8);
});

test('PH mosaic is not repeated over Europe, America or wrapped worlds', () => {
  for (const [lat, lon] of [[48.86, 2.35], [52.52, 13.405], [25.76, -80.19], [-23.55, -46.63], [14, 482]]) {
    const [wx, wy] = worldPoint(lat, lon, 7);
    assert.deepEqual(geographicRasterTileStrips({ x: Math.floor(wx / 256), y: Math.floor(wy / 256), z: 7 }, width, height), []);
  }
});

test('invalid raster dimensions and projections are rejected', () => {
  assert.throws(() => geographicRasterTileStrips({ x: 1, y: 1, z: 5 }, 0, height));
  assert.throws(() => geographicRasterTileStrips({ x: 1, y: 1, z: 5 }, width, height, [0, -90, 10, 90]));
});
