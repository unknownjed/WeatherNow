import React, { useEffect, useRef, useState } from 'react';
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, LocateFixed } from 'lucide-react';
import { apiUrl } from '../lib/apiUrl';
import type { AppSettings } from '../lib/api';
import { isPhilippineLocation } from '../lib/forecastSource';
import { getMapUiLabels, type MapUiLabels } from '../lib/uiLabels';
import type { CycloneFeed, LatLon, LiveCyclone } from '../lib/cycloneTypes';

interface Props { lat: number; lon: number; name: string; country?: string; isExpanded?: boolean; settings?: AppSettings }
const stamp = (time: string, language: string = 'en') => new Date(time).toLocaleString(language);
const old = (storm: LiveCyclone) => Date.now() - Date.parse(storm.issuedAt) > 12 * 60 * 60_000;
const cleanMapText = (value: string) => value
  .replace(/\u00e2\u20ac[\u201c\u201d]/g, '-')
  .replace(/\u00e2\u20ac\u00a6/g, '...');

const cycloneIcon = L.divIcon({
  className: 'cyclone-map-icon',
  html: '<svg viewBox="0 0 48 48" aria-label="Cyclone"><circle cx="24" cy="24" r="21" fill="#dc2626" stroke="#fff" stroke-width="2"/><path d="M24 10c-9 0-14 6-14 13 0 7 5 12 13 12 6 0 10-3 10-8 0-4-3-7-8-7-4 0-7 2-7 5 0 2 2 4 5 4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="2.5" fill="#fff"/></svg>',
  iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18],
});

// Do not draw a line across the entire map at the international date line.
export function splitTrack(points: LatLon[]): LatLon[][] {
  const segments: LatLon[][] = [];
  let segment: LatLon[] = [];
  for (const point of points) {
    if (segment.length && Math.abs(point[1] - segment[segment.length - 1][1]) > 180) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length > 1) segments.push(segment);
  return segments;
}

function FollowLocation({ lat, lon, isExpanded, zoom }: Props & { zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], zoom); }, [lat, lon, map, zoom]);
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);

    const container = map.getContainer();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map.invalidateSize({ pan: false }))
      : null;

    observer?.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [map, isExpanded]);
  return null;
}

function CloseCycloneBulletinOnMapClick({ onClose }: { onClose: () => void }) {
  useMapEvents({
    click: onClose,
  });
  return null;
}


type HimawariColorEntry = [[number, number], [number, number, number, number?]];
type HimawariFrame = {
  url: string;
  time: string;
  index: number;
  version: string;
};

type HimawariTimeline = {
  product: string;
  provider: string;
  playSpeedMs: number;
  bounds: { west: number; south: number; east: number; north: number };
  colormap: HimawariColorEntry[];
  frames: HimawariFrame[];
};

type HimawariFullDiskFrame = {
  basetime: string;
  validtime: string;
  time: string;
};

type HimawariFullDiskTimeline = {
  product: string;
  provider: string;
  playSpeedMs: number;
  frames: HimawariFullDiskFrame[];
};

function interpolateColor(
  kelvin: number,
  entries: HimawariColorEntry[],
): [number, number, number, number] {
  const stops = entries
    .filter(entry => Array.isArray(entry?.[0]) && Array.isArray(entry?.[1]))
    .map(entry => ({
      temp: Number(entry[0][0]),
      color: [
        Number(entry[1][0]),
        Number(entry[1][1]),
        Number(entry[1][2]),
        Number(entry[1][3] ?? 255),
      ] as [number, number, number, number],
    }))
    .filter(stop => Number.isFinite(stop.temp) && stop.color.slice(0, 3).every(Number.isFinite))
    .sort((a, b) => a.temp - b.temp);

  if (!stops.length) return [0, 0, 0, 0];
  if (kelvin <= stops[0].temp) return stops[0].color;
  if (kelvin >= stops[stops.length - 1].temp) return stops[stops.length - 1].color;

  for (let i = 1; i < stops.length; i++) {
    const right = stops[i];
    if (kelvin > right.temp) continue;
    const left = stops[i - 1];
    const span = Math.max(0.0001, right.temp - left.temp);
    const f = (kelvin - left.temp) / span;
    return [
      Math.round(left.color[0] + (right.color[0] - left.color[0]) * f),
      Math.round(left.color[1] + (right.color[1] - left.color[1]) * f),
      Math.round(left.color[2] + (right.color[2] - left.color[2]) * f),
      Math.round(left.color[3] + (right.color[3] - left.color[3]) * f),
    ];
  }
  return stops[stops.length - 1].color;
}

/**
 * PANaHON does not display himawari-data as a normal image.
 * Its browser renderer converts red-channel data to Kelvin:
 *   180 + (R / 255) * 132
 * then applies the timeline colormap and uses band-4 (alpha) as the
 * transparency mask. Reproduce that exact display model before adding it
 * to Leaflet so the raw gray rectangle never appears.
 */
function HimawariFullDiskAnimatedLayer({
  timeline,
  onFrameTime,
}: {
  timeline: HimawariFullDiskTimeline;
  onFrameTime?: (time: string) => void;
}) {
  const map = useMap();

  // Keep the enhanced Himawari layer visually stable. The previous version
  // advanced frames every second; because the canvas GridLayer is rebuilt when
  // `frame` changes, Leaflet briefly removed the old tiles before the new tiles
  // finished processing, which appeared as blinking. Show the newest real JMA
  // observation continuously and update only when the timeline itself refreshes.
  const frame = timeline.frames[timeline.frames.length - 1];

  useEffect(() => {
    if (frame) onFrameTime?.(frame.time);
  }, [frame, onFrameTime]);

  useEffect(() => {
    if (!frame) return;

    let disposed = false;

    // Enhanced IR palette matched to the reference view:
    // ordinary/warmer cloud remains grayscale, while progressively colder,
    // taller cloud tops become blue -> cyan -> green -> yellow -> orange -> red.
    // This changes only visualization; the underlying JMA B13 pixels stay the
    // same real Himawari observation.
    const enhancedIrColor = (gray: number): [number, number, number] | null => {
      if (gray < 142) return null;

      const stops: Array<[number, [number, number, number]]> = [
        [142, [35, 70, 210]],
        [158, [0, 145, 255]],
        [174, [0, 220, 190]],
        [188, [25, 205, 70]],
        [202, [230, 235, 0]],
        [216, [255, 150, 0]],
        [232, [245, 45, 0]],
        [245, [255, 235, 225]],
      ];

      for (let i = 1; i < stops.length; i += 1) {
        const [rightLevel, rightColor] = stops[i];
        if (gray > rightLevel) continue;
        const [leftLevel, leftColor] = stops[i - 1];
        const f = (gray - leftLevel) / Math.max(1, rightLevel - leftLevel);
        return [
          Math.round(leftColor[0] + (rightColor[0] - leftColor[0]) * f),
          Math.round(leftColor[1] + (rightColor[1] - leftColor[1]) * f),
          Math.round(leftColor[2] + (rightColor[2] - leftColor[2]) * f),
        ];
      }
      return stops[stops.length - 1][1];
    };

    const CanvasHimawariLayer = L.GridLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement('canvas');
        tile.width = 256;
        tile.height = 256;

        const ctx = tile.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          queueMicrotask(() => done(new Error('Canvas unavailable'), tile));
          return tile;
        }

        const z = Math.min(coords.z, 5);
        const scale = 2 ** Math.max(0, coords.z - z);
        const sourceX = Math.floor(coords.x / scale);
        const sourceY = Math.floor(coords.y / scale);
        const worldWidth = 2 ** z;
        const wrappedX = ((sourceX % worldWidth) + worldWidth) % worldWidth;

        const url = apiUrl(
          `/api/himawari-full-disk-tile?basetime=${encodeURIComponent(frame.basetime)}` +
          `&validtime=${encodeURIComponent(frame.validtime)}` +
          `&z=${z}&x=${wrappedX}&y=${sourceY}`,
        );

        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
          if (disposed) return;
          try {
            ctx.clearRect(0, 0, 256, 256);

            if (coords.z <= 5) {
              ctx.drawImage(image, 0, 0, 256, 256);
            } else {
              // Reproduce Leaflet maxNativeZoom behavior while still using a
              // canvas tile so the enhanced palette is available at zoom > 5.
              const subSize = 256 / scale;
              const offsetX = ((coords.x % scale) + scale) % scale;
              const offsetY = ((coords.y % scale) + scale) % scale;
              ctx.imageSmoothingEnabled = true;
              ctx.drawImage(
                image,
                offsetX * subSize,
                offsetY * subSize,
                subSize,
                subSize,
                0,
                0,
                256,
                256,
              );
            }

            const pixels = ctx.getImageData(0, 0, 256, 256);
            const data = pixels.data;
            const width = 256;
            const height = 256;
            const seen = new Uint8Array(width * height);
            const queue = new Int32Array(width * height);
            let head = 0;
            let tail = 0;

            // JMA JPEG tiles use near-white outside the actual satellite disk.
            // Remove only near-white areas connected to the tile edge, preserving
            // legitimate bright cloud tops inside the satellite footprint.
            const isNoData = (pixelIndex: number) => {
              const i = pixelIndex * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              return r >= 244 && g >= 244 && b >= 244 &&
                Math.max(r, g, b) - Math.min(r, g, b) <= 8;
            };

            const pushIfNoData = (pixelIndex: number) => {
              if (seen[pixelIndex] || !isNoData(pixelIndex)) return;
              seen[pixelIndex] = 1;
              queue[tail++] = pixelIndex;
            };

            for (let x = 0; x < width; x += 1) {
              pushIfNoData(x);
              pushIfNoData((height - 1) * width + x);
            }
            for (let y = 1; y < height - 1; y += 1) {
              pushIfNoData(y * width);
              pushIfNoData(y * width + (width - 1));
            }

            while (head < tail) {
              const pixelIndex = queue[head++];
              const x = pixelIndex % width;
              const y = Math.floor(pixelIndex / width);
              data[pixelIndex * 4 + 3] = 0;

              if (x > 0) pushIfNoData(pixelIndex - 1);
              if (x + 1 < width) pushIfNoData(pixelIndex + 1);
              if (y > 0) pushIfNoData(pixelIndex - width);
              if (y + 1 < height) pushIfNoData(pixelIndex + width);
            }

            // Color only valid satellite pixels. The JMA tile is grayscale, so
            // its luminance is used as the enhancement index. Lower cloud/water
            // remains grayscale just like the supplied reference image.
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue;
              const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
              const enhanced = enhancedIrColor(gray);
              if (!enhanced) continue;

              data[i] = enhanced[0];
              data[i + 1] = enhanced[1];
              data[i + 2] = enhanced[2];
            }

            ctx.putImageData(pixels, 0, 0);
            done(null, tile);
          } catch (error) {
            done(error as Error, tile);
          }
        };

        image.onerror = () => {
          if (!disposed) done(new Error('Himawari full-disk tile unavailable'), tile);
        };

        image.src = url;
        return tile;
      },
    });

    const layer = new CanvasHimawariLayer({
      tileSize: 256,
      opacity: 0.48,
      minZoom: 4,
      maxZoom: 10,
      noWrap: true,
      updateWhenIdle: true,
      updateWhenZooming: false,
      attribution: 'Himawari-9 Enhanced IR - Japan Meteorological Agency',
    });

    layer.setZIndex(500);
    layer.addTo(map);

    return () => {
      disposed = true;
      if (map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map, frame]);

  return null;
}

function HimawariAnimatedOverlay({
  timeline,
  onFrameTime,
}: {
  timeline: HimawariTimeline;
  onFrameTime?: (time: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      !timeline?.frames?.length ||
      !timeline.bounds ||
      !Array.isArray(timeline.colormap) ||
      !timeline.colormap.length
    ) return;

    let disposed = false;
    let overlay: L.ImageOverlay | null = null;
    let animationTimer: number | null = null;
    const objectUrls: string[] = [];

    // The PANaHON temperature colormap depends only on the 8-bit source red
    // channel, so prepare this lookup once for the whole animation timeline.
    const lutR = new Uint8ClampedArray(256);
    const lutG = new Uint8ClampedArray(256);
    const lutB = new Uint8ClampedArray(256);
    const lutA = new Uint8ClampedArray(256);
    for (let sourceRed = 0; sourceRed < 256; sourceRed += 1) {
      const kelvin = 180 + (sourceRed / 255) * 132;
      const [r, g, b, mappedAlpha] = interpolateColor(kelvin, timeline.colormap);
      lutR[sourceRed] = r;
      lutG[sourceRed] = g;
      lutB[sourceRed] = b;
      lutA[sourceRed] = mappedAlpha;
    }

    const enhanceFrame = (frame: HimawariFrame) => new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        if (disposed) return reject(new Error('disposed'));
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas unavailable');

          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = pixels.data;

          for (let i = 0; i < data.length; i += 4) {
            const sourceRed = data[i];
            const sourceAlpha = data[i + 3];
            data[i] = lutR[sourceRed];
            data[i + 1] = lutG[sourceRed];
            data[i + 2] = lutB[sourceRed];
            const mask = sourceAlpha >= 90 ? 1 : sourceAlpha / 89.25;
            data[i + 3] = Math.round(lutA[sourceRed] * mask);
          }
          context.putImageData(pixels, 0, 0);

          canvas.toBlob(blob => {
            if (disposed || !blob) return reject(new Error('disposed'));
            resolve(URL.createObjectURL(blob));
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error(`Could not load Himawari frame ${frame.index}`));
      image.src = frame.url;
    });

    const startAnimation = async () => {
      const readyFrames: Array<{ url: string; time: string }> = [];

      // PANaHON's own high-resolution satellite worker uses six frames.
      // Enhance them sequentially and yield between frames so dashboard input
      // remains responsive while the animation buffer is being prepared.
      for (const frame of timeline.frames) {
        if (disposed) return;
        try {
          const url = await enhanceFrame(frame);
          if (disposed) {
            URL.revokeObjectURL(url);
            return;
          }
          objectUrls.push(url);
          readyFrames.push({ url, time: frame.time });
        } catch (error) {
          if (!disposed) console.warn('Skipping unavailable Himawari animation frame:', error);
        }
        await new Promise<void>(resolve => window.setTimeout(resolve, 30));
      }

      if (disposed || !readyFrames.length) return;

      const { west, south, east, north } = timeline.bounds;
      let index = 0;
      overlay = L.imageOverlay(
        readyFrames[0].url,
        [[south, west], [north, east]],
        {
          opacity: 0.60,
          zIndex: 640,
          attribution: 'Himawari IR Extended - PAGASA PANaHON',
          interactive: false,
        },
      ).addTo(map);
      onFrameTime?.(readyFrames[0].time);

      if (readyFrames.length > 1) {
        // PANaHON's satelliteTimeSlider sets playSpeedMs = 1000.
        animationTimer = window.setInterval(() => {
          if (disposed || !overlay) return;
          index = (index + 1) % readyFrames.length;
          overlay.setUrl(readyFrames[index].url);
          onFrameTime?.(readyFrames[index].time);
        }, Math.max(250, Number(timeline.playSpeedMs) || 1000));
      }
    };

    void startAnimation();

    return () => {
      disposed = true;
      if (animationTimer !== null) window.clearInterval(animationTimer);
      if (overlay && map.hasLayer(overlay)) map.removeLayer(overlay);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [map, timeline, onFrameTime]);

  return null;
}


function RegionalSatelliteLayer({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();

  useEffect(() => {
    // Himawari is retained for Asia/Pacific. Outside that real footprint, use
    // the matching geostationary satellite instead of leaving the map blank.
    if (lon >= 65 && lon <= 180) return;

    const isAmericas = lon < -30;
    const layerName = isAmericas
      ? (lon < -105
          ? 'GOES-West_ABI_Band13_Clean_Infrared'
          : 'GOES-East_ABI_Band13_Clean_Infrared')
      : 'EUMETSAT_MTG_0Deg_IR105_10min';

    const attribution = isAmericas
      ? 'GOES ABI Clean IR - NASA GIBS / NOAA'
      : 'Meteosat/MTG IR - NASA GIBS / EUMETSAT';

    const layer = L.tileLayer.wms(
      'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
      {
        layers: layerName,
        format: 'image/png',
        transparent: true,
        opacity: 0.48,
        attribution,
        version: '1.3.0',
        maxZoom: 10,
      },
    );

    layer.setZIndex(500);
    layer.addTo(map);
    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map, lat, lon]);

  return null;
}

function MtgEnhancedIrLayer() {
  const map = useMap();

  useEffect(() => {
    let disposed = false;

    const enhancedIrColor = (gray: number): [number, number, number] | null => {
      if (gray < 142) return null;

      const stops: Array<[number, [number, number, number]]> = [
        [142, [35, 70, 210]],
        [158, [0, 145, 255]],
        [174, [0, 220, 190]],
        [188, [25, 205, 70]],
        [202, [230, 235, 0]],
        [216, [255, 150, 0]],
        [232, [245, 45, 0]],
        [245, [255, 235, 225]],
      ];

      for (let i = 1; i < stops.length; i += 1) {
        const [rightLevel, rightColor] = stops[i];
        if (gray > rightLevel) continue;
        const [leftLevel, leftColor] = stops[i - 1];
        const f = (gray - leftLevel) / Math.max(1, rightLevel - leftLevel);
        return [
          Math.round(leftColor[0] + (rightColor[0] - leftColor[0]) * f),
          Math.round(leftColor[1] + (rightColor[1] - leftColor[1]) * f),
          Math.round(leftColor[2] + (rightColor[2] - leftColor[2]) * f),
        ];
      }

      return stops[stops.length - 1][1];
    };

    const Layer = L.GridLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          queueMicrotask(() => done(new Error('Canvas unavailable'), canvas));
          return canvas;
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
          if (disposed) return;

          try {
            ctx.clearRect(0, 0, 256, 256);
            ctx.drawImage(image, 0, 0, 256, 256);

            const pixels = ctx.getImageData(0, 0, 256, 256);
            const data = pixels.data;

            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue;

              const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);

              // Remove near-black no-data.
              if (gray <= 10) {
                data[i + 3] = 0;
                continue;
              }

              const enhanced = enhancedIrColor(gray);
              if (!enhanced) continue;

              data[i] = enhanced[0];
              data[i + 1] = enhanced[1];
              data[i + 2] = enhanced[2];
            }

            ctx.putImageData(pixels, 0, 0);
            done(null, canvas);
          } catch (error) {
            done(error as Error, canvas);
          }
        };

        image.onerror = () => {
          if (!disposed) done(new Error('MTG IR tile unavailable'), canvas);
        };

        image.src = apiUrl(
          `/api/mtg-enhanced-ir-tile?z=${coords.z}&x=${coords.x}&y=${coords.y}`
        );

        return canvas;
      },
    });

    const layer = new Layer({
      tileSize: 256,
      minZoom: 4,
      maxZoom: 10,
      noWrap: true,
      bounds: L.latLngBounds([[-60, -30], [72, 77]]),
      updateWhenIdle: true,
      updateWhenZooming: false,
      attribution: 'MTG Enhanced IR - EUMETSAT',
    });

    layer.setZIndex(491);
    layer.addTo(map);

    return () => {
      disposed = true;
      if (map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
function WhiteMapBoundaryLayer() {
  const [countries, setCountries] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(
      'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json',
      { signal: controller.signal },
    )
      .then(response => {
        if (!response.ok) throw new Error(`World boundaries returned ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!controller.signal.aborted) setCountries(data);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.warn('World boundary layer unavailable:', error);
        }
      });

    return () => controller.abort();
  }, []);

  if (!countries) return null;

  return (
    <Pane name="weather-map-white-boundaries" style={{ zIndex: 665, pointerEvents: 'none' }}>
      <GeoJSON
        data={countries}
        interactive={false}
        style={() => ({
          color: '#ffffff',
          weight: 0.7,
          opacity: 0.62,
          fill: false,
          fillOpacity: 0,
          lineCap: 'round',
          lineJoin: 'round',
        })}
      />
    </Pane>
  );
}

function StormDetails({ storm, ui, language }: { storm: LiveCyclone; ui: MapUiLabels; language: string }) {
  return <>
    <strong>{storm.name} - {storm.category}</strong><br />
    {ui.source}: {storm.agency}<br />
    {ui.issued}: {stamp(storm.issuedAt, language)}<br />
    {ui.positionTime}: {stamp(storm.observedAt, language)}<br />
    {old(storm) && <><strong>{ui.olderAdvisory}</strong><br /></>}
    {storm.warning && <>{storm.warning}<br /></>}
    <a href={storm.sourceUrl} target="_blank" rel="noopener noreferrer">{ui.officialAdvisory}</a>
  </>;
}

export function PagasaTyphoonMap({ lat, lon, name, country = '', isExpanded, settings }: Props) {
  const language = settings?.language || 'en';
  const ui = React.useMemo(() => getMapUiLabels(language), [language]);
  const mapRef = useRef<L.Map | null>(null);
  const mapZoom = typeof window !== 'undefined' && window.matchMedia('(max-width: 1199px)').matches ? 4 : 5;
  const [feed, setFeed] = useState<CycloneFeed | null>(null);
  const [feedError, setFeedError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showTracks, setShowTracks] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(false);
  const [showHimawari, setShowHimawari] = useState(true);
  const [satellitePosition, setSatellitePosition] = useState<[number, number]>([lat, lon]);
  const [himawariFullDiskTimeline, setHimawariFullDiskTimeline] = useState<HimawariFullDiskTimeline | null>(null);
  const [himawariFullDiskFrameTime, setHimawariFullDiskFrameTime] = useState('');
  const [himawariFullDiskError, setHimawariFullDiskError] = useState('');
  const [rainViewerFramePath, setRainViewerFramePath] = useState('');
  const [useDirectRainViewerTiles, setUseDirectRainViewerTiles] = useState(false);
  const [rainViewerError, setRainViewerError] = useState('');
  const [pagasaPosition, setPagasaPosition] = useState<LatLon | null>(null);
  const [pagasaStatus, setPagasaStatus] = useState('');
  const [selected, setSelected] = useState('');
  const initialLocationRef = useRef<LatLon>([lat, lon]);
  const [deviceLocation, setDeviceLocation] = useState<LatLon>(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('weathernow_device_location') || 'null');
      if (Array.isArray(cached) && cached.length === 2 &&
          Number.isFinite(Number(cached[0])) && Number.isFinite(Number(cached[1]))) {
        return [Number(cached[0]), Number(cached[1])];
      }
    } catch {}
    return initialLocationRef.current;
  });

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch(apiUrl('/api/cyclones'), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]) });
        if (!response.ok) throw new Error('Cyclone endpoint unavailable');
        const data = await response.json();
        if (!Array.isArray(data.storms) || !Array.isArray(data.sources)) throw new Error('Cyclone endpoint needs the updated server');
        if (!controller.signal.aborted) { setFeed(data); setFeedError(''); }
      } catch {
        if (!controller.signal.aborted) {
          setFeed(null);
          setFeedError(ui.cycloneDataUnavailable);
        }
      } finally { busy = false; }
    };
    void load();
    const timer = window.setInterval(load, 10 * 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [ui]);

  // Independent Himawari satellite and bulletin requests: an unavailable source
  // must not prevent the other layers or the dashboard from rendering.
  useEffect(() => {
    const controller = new AbortController();
    const get = async (path: string) => {
      const response = await fetch(apiUrl(path), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!response.ok) throw new Error(path);
      return response.json();
    };
    const load = () => {
      // Whole-map Himawari: use JMA's real full-disk B13 infrared tile timeline.
      // This removes the old Philippines-only geographic footprint.
      void get('/api/himawari-full-disk').then(data => {
        if (
          controller.signal.aborted ||
          !Array.isArray(data?.frames) ||
          !data.frames.length
        ) return;

        const frames = data.frames.filter((frame: any) =>
          typeof frame?.basetime === 'string' &&
          typeof frame?.validtime === 'string' &&
          typeof frame?.time === 'string'
        );
        if (!frames.length) throw new Error('No usable Himawari full-disk frames');

        setHimawariFullDiskTimeline({ ...data, frames });
        setHimawariFullDiskFrameTime(frames[0].time);
        setHimawariFullDiskError('');
      }).catch(() => {
        if (!controller.signal.aborted) {
          setHimawariFullDiskTimeline(null);
          setHimawariFullDiskFrameTime('');
          setHimawariFullDiskError('Himawari full-disk animation is temporarily unavailable.');
        }
      });

      // Do not request/render PANaHON's regional Himawari image here.
      // Weather Track must use the JMA full-disk layer only so there is no
      // rectangular partial-coverage image on top of the whole-map satellite view.

      // Keep the current RainViewer radar frame ready as the backup layer.
      // It is rendered only when Himawari is unavailable.
      void get('/api/radar').then(data => {
        if (controller.signal.aborted) return;
        const past = Array.isArray(data?.radar?.past) ? data.radar.past : [];
        const nowcast = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : [];
        const frames = [...past, ...nowcast].filter(frame => typeof frame?.path === 'string');
        const newest = frames[frames.length - 1];
        setRainViewerFramePath(newest?.path || '');
        setUseDirectRainViewerTiles(false);
        setRainViewerError(newest?.path ? '' : 'RainViewer backup has no current radar frame.');
      }).catch(() => {
        if (!controller.signal.aborted) {
          setRainViewerFramePath('');
          setRainViewerError('RainViewer backup is temporarily unavailable.');
        }
      });

      void get('/api/pagasa-cyclone').then(data => {
        if (controller.signal.aborted) return;
        const valid = data.active && Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90 && Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180;
        setPagasaPosition(valid ? [data.latitude, data.longitude] : null);
        setPagasaStatus(valid ? ui.pagasaPositionAvailable : ui.pagasaNoCoordinates);
      }).catch(() => {
        if (!controller.signal.aborted) { setPagasaPosition(null); setPagasaStatus(ui.pagasaBulletinUnavailable); }
      });
    };
    load();
    const timer = window.setInterval(load, 2 * 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [country, ui]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    let disposed = false;
    const updateDeviceLocation = (position: GeolocationPosition) => {
      if (disposed) return;
      const next: LatLon = [position.coords.latitude, position.coords.longitude];
      setDeviceLocation(next);
      try { localStorage.setItem('weathernow_device_location', JSON.stringify(next)); } catch {}
    };

    // Use a fresh device position for the green dot. This state is independent
    // from the searched weather location (`lat`/`lon`), so city searches never
    // move the current-location marker.
    navigator.geolocation.getCurrentPosition(
      updateDeviceLocation,
      () => undefined,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );

    const watchId = navigator.geolocation.watchPosition(
      updateDeviceLocation,
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 },
    );

    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    setSatellitePosition([lat, lon]);
  }, [lat, lon]);

  const satelliteLat = satellitePosition[0];
  const satelliteLon = satellitePosition[1];

  const storms = feed?.storms || [];
  const selectedStorm = storms.find(storm => storm.id === selected);
  const focusStorm = (id: string) => {
    setSelected(id);
    const storm = storms.find(s => s.id === id);
    if (storm) mapRef.current?.setView(storm.position, mapZoom);
  };

  return <div className="relative w-full h-full min-h-[360px] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
    <div className="w-full flex-1 relative min-h-0">
      <MapContainer ref={mapRef} center={[lat, lon]} zoom={mapZoom} minZoom={mapZoom} maxZoom={10}
        worldCopyJump style={{ width: '100%', height: '100%', minHeight: isExpanded ? '0' : '300px' }} dragging={false} scrollWheelZoom={false} keyboard={false} boxZoom={false}>
        <FollowLocation lat={lat} lon={lon} name={name} isExpanded={isExpanded} zoom={mapZoom} />
        <CloseCycloneBulletinOnMapClick onClose={() => setExpanded(false)} />
        <TileLayer attribution="&copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={10} maxZoom={10} />

        {showHimawari && satelliteLon >= 65 && satelliteLon <= 180 && himawariFullDiskTimeline && (
          <HimawariFullDiskAnimatedLayer
            timeline={himawariFullDiskTimeline}
            onFrameTime={setHimawariFullDiskFrameTime}
          />
        )}
        {showHimawari && !(satelliteLon >= 65 && satelliteLon <= 180) && (
          <RegionalSatelliteLayer lat={satelliteLat} lon={satelliteLon} />
        )}
        
        
        
        {/* MTG Enhanced IR Europe Africa */}
        {showHimawari && satelliteLon >= -30 && satelliteLon < 65 && <MtgEnhancedIrLayer />}
        {/* End MTG Enhanced IR Europe Africa */}
        <WhiteMapBoundaryLayer />
        {showHimawari && satelliteLon >= 65 && satelliteLon <= 180 && !himawariFullDiskTimeline && rainViewerFramePath && (
          <TileLayer
            key={`${rainViewerFramePath}-${useDirectRainViewerTiles ? 'direct' : 'proxy'}`}
            attribution="RainViewer"
            url={useDirectRainViewerTiles
              ? `https://tilecache.rainviewer.com${rainViewerFramePath}/256/{z}/{x}/{y}/2/1_1.png`
              : apiUrl(`/api/radar-tile?path=${encodeURIComponent(rainViewerFramePath)}&z={z}&x={x}&y={y}`)}
            opacity={0.72}
            zIndex={500}
            maxNativeZoom={7}
            maxZoom={10}
            eventHandlers={{
              tileerror: () => {
                // Render deployments can occasionally time out while proxying the
                // RainViewer CDN. Retry the same frame directly in the browser so
                // mobile/tablet maps do not stay blank.
                if (!useDirectRainViewerTiles) setUseDirectRainViewerTiles(true);
              },
            }}
          />
        )}
        {storms.map(storm => <React.Fragment key={storm.id}>
          {showTracks && splitTrack(storm.history).map((segment, index) => <Polyline key={`past-${index}`} positions={segment} pathOptions={{ color: '#94a3b8', weight: 2 }} />)}
          {showTracks && splitTrack([storm.position, ...storm.forecast.map(f => f.position)]).map((segment, index) =>
            <Polyline key={`forecast-${index}`} positions={segment} pathOptions={{ color: storm.agency === 'NHC' ? '#fb923c' : '#c084fc', weight: 3, dashArray: '7 6' }}>
              <Popup><StormDetails storm={storm} ui={ui} language={language} /></Popup>
            </Polyline>)}
          {showTracks && storm.forecast.map(fix => <React.Fragment key={fix.validAt}>
            <CircleMarker center={fix.position} radius={4} pathOptions={{ color: '#fff', fillColor: '#f97316', fillOpacity: 1, weight: 1 }}>
              <Popup>{storm.name} - {storm.agency}<br />{ui.forecastValid}: {stamp(fix.validAt, language)}<br />+{fix.leadHours} {ui.hours}</Popup>
            </CircleMarker>
            {showUncertainty && fix.probabilityRadiusM && <Circle center={fix.position} radius={fix.probabilityRadiusM} pathOptions={{ color: '#c084fc', weight: 1, dashArray: '4 4', fillOpacity: 0.025 }} />}
          </React.Fragment>)}
          <Marker position={storm.position} icon={cycloneIcon}>
            <Popup><StormDetails storm={storm} ui={ui} language={language} /></Popup>
          </Marker>
        </React.Fragment>)}
        {pagasaPosition && <CircleMarker center={pagasaPosition} radius={6} pathOptions={{ color: '#fbbf24', weight: 2 }}>
          <Popup>{ui.parsedBulletinPosition}<br />{ui.bulletinTimeUnverified}<br /><a href="https://bagong.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin" target="_blank" rel="noopener noreferrer">{ui.officialPagasaBulletin}</a></Popup>
        </CircleMarker>}
        <Pane name="current-location-top" style={{ zIndex: 720 }}>
          <Marker
            position={deviceLocation}
            icon={L.divIcon({
              className: 'current-location-marker',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
              html: `
                <span style="
                  display:block;
                  width:14px;
                  height:14px;
                  margin:2px;
                  border-radius:9999px;
                  background:#10b981;
                  border:2px solid #ffffff;
                  box-sizing:border-box;
                  box-shadow:
                    0 0 5px 2px rgba(16,185,129,.65),
                    0 0 12px 5px rgba(16,185,129,.34),
                    0 0 20px 9px rgba(16,185,129,.16);
                "></span>
              `,
            })}
          >
            <Popup>Current Location</Popup>
          </Marker>
        </Pane>
      </MapContainer>
    </div>
    <div className="relative flex-none h-11 p-1 bg-slate-950 z-[1000]">
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="w-full h-9 flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white">
        <span className="truncate">{cleanMapText(ui.cycloneBulletin)} - {feedError ? cleanMapText(ui.feedUnavailable) : feed ? `${storms.length} ${cleanMapText(ui.reportedBy)}` : cleanMapText(ui.loading)}</span>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      <div className={`absolute bottom-full inset-x-1 flex flex-col items-end gap-2 pointer-events-none ${expanded ? '' : 'pb-7'}`}>
        <button
          type="button"
          title={ui.showYourLocation}
          aria-label={ui.showYourLocation}
          onClick={() => {
            const target = deviceLocation || [lat, lon];

            // Switch the satellite region immediately so the correct imagery
            // reappears even before the rest of the dashboard finishes
            // synchronizing to Current Location.
            setSatellitePosition([target[0], target[1]]);
            mapRef.current?.setView(target, mapZoom);

            window.dispatchEvent(new CustomEvent('weathernow:use-current-location', {
              detail: {
                latitude: target[0],
                longitude: target[1],
              },
            }));
          }}
          className="pointer-events-auto mr-1 flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white shadow-md"
        >
          <LocateFixed size={17} />
        </button>
      {expanded && <div className="pointer-events-auto w-full max-h-56 overflow-y-auto rounded border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-xl">
        <select aria-label={ui.chooseCyclone} value={selectedStorm ? selected : ''} onChange={e => focusStorm(e.target.value)} className="w-full rounded bg-slate-800 border border-slate-600 p-1 text-white">
          <option value="">{ui.chooseCyclone}</option>
          {storms.map(storm => <option key={storm.id} value={storm.id}>{storm.name} ({storm.agency})</option>)}
        </select>
        <div className="flex flex-wrap gap-3 my-2">
          <label><input type="checkbox" checked={showHimawari} onChange={e => setShowHimawari(e.target.checked)} /> Satellite IR</label>
          <label><input type="checkbox" checked={showTracks} onChange={e => setShowTracks(e.target.checked)} /> {ui.forecastTracks}</label>
          <label><input type="checkbox" checked={showUncertainty} onChange={e => setShowUncertainty(e.target.checked)} /> {ui.uncertaintyCircles}</label>
        </div>
        {selectedStorm && <p className="mb-2"><StormDetails storm={selectedStorm} ui={ui} language={language} /></p>}
        <p>{ui.trackLegend}</p>
        {feedError && <p role="status" className="text-amber-300">{feedError}</p>}
        {feed?.sources
          .filter(source => source.state !== 'unavailable')
          .map(source => <p key={source.agency}>{source.agency}: {source.state}{source.message ? ` - ${source.message}` : ''}</p>)}
        {showHimawari && (
          <>
            {himawariFullDiskTimeline && (
              <p>
                Himawari full-disk animation: {himawariFullDiskFrameTime ? stamp(himawariFullDiskFrameTime, language) : 'loading frames...'}
                {' '}- {himawariFullDiskTimeline.frames.length} real JMA frames. Whole-map satellite layer.
              </p>
            )}
            {!himawariFullDiskTimeline && rainViewerFramePath && (
              <p>Himawari unavailable - RainViewer radar backup is active.</p>
            )}
            {himawariFullDiskError && <p>{himawariFullDiskError}</p>}
            {!himawariFullDiskTimeline && rainViewerError && <p>{rainViewerError}</p>}
          </>
        )}
        {isPhilippineLocation(country) ? <>
          <p>{pagasaStatus}</p>
          <p>Philippine current temperature, humidity and wind use a recent connected PAGASA station when available. The five-day panel uses PAGASA's nearest complete city outlook; the 24-hour panel and fields PAGASA does not publish use the coordinate-specific fallback. <a href="https://bagong.pagasa.dost.gov.ph/weather" target="_blank" rel="noopener noreferrer" className="underline">{ui.officialPagasaForecast}</a></p>
          <p className="mt-1">PAGASA remains the authority for Philippine warnings. These feeds do not cover every basin.</p>
        </> : <>
          <p>{ui.outsidePhilippinesSource}</p>
          <p className="mt-1">{ui.checkLocalWarnings}</p>
        </>}
      </div>}
      </div>
    </div>
  </div>;
}







