import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { geographicRasterTileStrips, PAGASA_RADAR_EXTENT } from '../lib/radarProjection';

/** Reprojects the official geographic mosaic into Leaflet's EPSG:3857 grid. */
export function PagasaRadarLayer({ url, onError, onReady }: { url: string; onError: () => void; onReady?: () => void }) {
  const map = useMap();
  const errorRef = useRef(onError);
  const readyRef = useRef(onReady);
  errorRef.current = onError;
  readyRef.current = onReady;

  useEffect(() => {
    let disposed = false;
    let layer: L.GridLayer | undefined;
    const image = new Image();
    // Drawing an external image is allowed without CORS. Never read pixels or
    // export this canvas: that would require upstream CORS and break the layer.
    const fail = () => {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(timeout);
      layer?.remove();
      errorRef.current();
    };
    const timeout = window.setTimeout(fail, 20_000);
    image.onerror = fail;
    image.onload = () => {
      if (disposed) return;
      window.clearTimeout(timeout);
      if (!image.naturalWidth || !image.naturalHeight) { fail(); return; }
      class ReprojectedRadar extends L.GridLayer {
        createTile(coords: L.Coords) {
          const tile = document.createElement('canvas');
          tile.width = tile.height = 256;
          tile.dataset.radarProjection = 'EPSG:4326-to-EPSG:3857';
          tile.setAttribute('aria-hidden', 'true');
          const context = tile.getContext('2d');
          if (!context) return tile;
          // Preserve the published rain palette, without introducing blur.
          context.imageSmoothingEnabled = false;
          for (const strip of geographicRasterTileStrips(coords, image.naturalWidth, image.naturalHeight)) {
            context.drawImage(image, ...strip);
          }
          return tile;
        }
      }
      const [west, south, east, north] = PAGASA_RADAR_EXTENT;
      layer = new ReprojectedRadar({
        tileSize: 256, bounds: [[south, west], [north, east]], noWrap: true,
        opacity: 0.78, zIndex: 1150, minZoom: 3, maxZoom: 10,
        attribution: '<a href="https://bagong.pagasa.dost.gov.ph/radar">PAGASA precipitation / rainfall estimate</a>',
      });
      layer.addTo(map);
      readyRef.current?.();
    };
    image.src = url;
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      image.onload = image.onerror = null;
      layer?.remove();
    };
  }, [url, map]);
  return null;
}
