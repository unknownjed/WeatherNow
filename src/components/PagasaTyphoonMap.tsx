import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Wind,
  ShieldAlert,
  Eye,
  Compass,
  Layers,
  CloudRain,
  Radio,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sliders,
  Calendar,
  Waves,
  Gauge,
  CloudLightning,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '../lib/api';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type StormCategory = 'TD' | 'TS' | 'STS' | 'TY' | 'STY' | 'CAT1' | 'CAT2' | 'CAT3' | 'CAT4' | 'CAT5';

export interface StormTrackPoint {
  time: string;
  hourOffset: number;
  lat: number;
  lng: number;
  category: StormCategory;
  windKmh: number;
  windKnots: number;
  gustsKmh: number;
  pressureHpa: number;
  movement: string;
  isForecast?: boolean;
  forecastConeRadiusKm?: number;
  galeRadiusKm?: number;
  stormRadiusKm?: number;
  bulletinNote?: string;
}

export interface TropicalCyclone {
  id: string;
  name: string;
  intlName: string;
  basin: string;
  status: string;
  currentCategory: StormCategory;
  maxWindsKmh: number;
  peakGustsKmh: number;
  centralPressureHpa: number;
  movement: string;
  warningSignal: string;
  track: StormTrackPoint[];
}

// Color scale helper for PAGASA & International Saffir-Simpson / WMO categories
export function getStormCategoryColor(cat: StormCategory): string {
  switch (cat) {
    case 'TD':
      return '#3b82f6'; // Blue (Tropical Depression)
    case 'TS':
      return '#06b6d4'; // Cyan (Tropical Storm)
    case 'STS':
      return '#eab308'; // Yellow-Orange (Severe Tropical Storm)
    case 'TY':
    case 'CAT1':
    case 'CAT2':
      return '#f97316'; // Orange / Red (Typhoon / Cat 1-2)
    case 'CAT3':
    case 'CAT4':
      return '#ef4444'; // Red (Severe Typhoon / Cat 3-4)
    case 'STY':
    case 'CAT5':
      return '#d946ef'; // Magenta / Purple (Super Typhoon / Cat 5)
    default:
      return '#3b82f6';
  }
}

export function getStormCategoryLabel(cat: StormCategory): string {
  switch (cat) {
    case 'TD': return 'Tropical Depression';
    case 'TS': return 'Tropical Storm';
    case 'STS': return 'Severe Tropical Storm';
    case 'TY': return 'Typhoon';
    case 'STY': return 'Super Typhoon';
    case 'CAT1': return 'Category 1 Hurricane';
    case 'CAT2': return 'Category 2 Hurricane';
    case 'CAT3': return 'Major Hurricane (Cat 3)';
    case 'CAT4': return 'Major Hurricane (Cat 4)';
    case 'CAT5': return 'Catastrophic Hurricane (Cat 5)';
    default: return 'Tropical Disturbance';
  }
}

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Compass bearing
function calculateCompassBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;
  const compass = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return compass[Math.floor((brng + 11.25) / 22.5) % 16];
}

// Generate dynamic 70% probability cone polygon for the projected route
function generateForecastConePolygon(track: StormTrackPoint[], eyeIndex: number): [number, number][] {
  const forecastPoints = track.slice(eyeIndex);
  if (forecastPoints.length < 2) return [];

  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (let i = 0; i < forecastPoints.length; i++) {
    const pt = forecastPoints[i];
    const coneRadiusKm = pt.forecastConeRadiusKm || Math.max(30, i * 45 + 30);
    const radiusDegLat = coneRadiusKm / 111;
    const radiusDegLng = coneRadiusKm / (111 * Math.cos((pt.lat * Math.PI) / 180));

    let angle = 0;
    if (i < forecastPoints.length - 1) {
      const next = forecastPoints[i + 1];
      angle = Math.atan2(next.lng - pt.lng, next.lat - pt.lat);
    } else if (i > 0) {
      const prev = forecastPoints[i - 1];
      angle = Math.atan2(pt.lng - prev.lng, pt.lat - prev.lat);
    }

    const perpLeft = angle - Math.PI / 2;
    const perpRight = angle + Math.PI / 2;

    leftEdge.push([
      pt.lat + Math.cos(perpLeft) * radiusDegLat,
      pt.lng + Math.sin(perpLeft) * radiusDegLng,
    ]);

    rightEdge.unshift([
      pt.lat + Math.cos(perpRight) * radiusDegLat,
      pt.lng + Math.sin(perpRight) * radiusDegLng,
    ]);
  }

  return [...leftEdge, ...rightEdge];
}

// Generates a realistic storm, hurricane, cyclone, or typhoon track approaching or passing near the user's active searched coordinates anywhere globally
function generateRegionalStormTrack(userLat: number, userLon: number, locationName: string): TropicalCyclone {
  const isNorthern = userLat >= 0;
  const absLat = Math.abs(userLat);
  const cleanCity = locationName.split(',')[0].trim();

  // 1. Determine Meteorological Basin & Nomenclature based on worldwide coordinates
  let basin = 'Western North Pacific';
  let stormType = 'Typhoon';
  let agency = 'PAGASA PAR / JMA';
  let warningSignal = 'TCWS Signal #4 (Typhoon Warning)';
  let defaultCategory: StormCategory = 'STY';
  let stormName = 'Super Typhoon MAYA';
  let intlName = 'MAYA-26W';

  // Western North Pacific & SE Asia (Philippines, Japan, China, Taiwan, Vietnam, etc.)
  if (isNorthern && userLon >= 100 && userLon <= 180) {
    basin = userLat >= 4 && userLat <= 21 && userLon >= 114 && userLon <= 135 
      ? 'Philippine Area of Responsibility (PAGASA PAR)' 
      : 'Western North Pacific (JMA RSMC)';
    stormType = 'Super Typhoon';
    agency = 'PAGASA / JMA';
    warningSignal = 'TCWS Signal #4 / Severe Weather Warning';
    defaultCategory = 'STY';
    stormName = `Super Typhoon ${cleanCity.toUpperCase()}-VORTEX`;
    intlName = `WPAC-${Math.abs(Math.round(userLat * 10))}`;
  }
  // North Atlantic, Gulf of Mexico & Caribbean (USA East/Gulf Coast, Mexico, Bahamas, etc.)
  else if (isNorthern && userLon >= -105 && userLon <= -15) {
    basin = 'North Atlantic & Gulf Basin (NHC Miami)';
    stormType = 'Major Hurricane';
    agency = 'NOAA / NHC Miami';
    warningSignal = 'Hurricane Warning • Storm Surge Watch';
    defaultCategory = 'CAT5';
    stormName = `Hurricane ${cleanCity.toUpperCase()}`;
    intlName = `AL-${Math.abs(Math.round(userLon * 10))}`;
  }
  // Eastern & Central Pacific (Hawaii, Western Mexico, California, Baja)
  else if (isNorthern && (userLon < -105 || userLon > 175)) {
    basin = 'Eastern & Central Pacific (CPHC/NHC)';
    stormType = 'Major Hurricane';
    agency = 'NOAA / CPHC Honolulu';
    warningSignal = 'Hurricane Warning • Extreme Wind Alert';
    defaultCategory = 'CAT4';
    stormName = `Hurricane ${cleanCity.toUpperCase()}`;
    intlName = `EP-${Math.abs(Math.round(userLat * 10))}`;
  }
  // North Indian Ocean (India, Bay of Bengal, Arabian Sea, Bangladesh, Sri Lanka, Oman)
  else if (isNorthern && userLon >= 45 && userLon < 100) {
    basin = 'North Indian Ocean (IMD RSMC New Delhi)';
    stormType = 'Extremely Severe Cyclonic Storm';
    agency = 'IMD New Delhi';
    warningSignal = 'Red Cyclone Alert • Coastal Evacuation Warning';
    defaultCategory = 'STY';
    stormName = `Cyclonic Storm ${cleanCity.toUpperCase()}`;
    intlName = `NIO-${Math.abs(Math.round(userLat * 10))}`;
  }
  // South Pacific & Australia (Australia, New Zealand, Fiji, PNG, Vanuatu)
  else if (!isNorthern && userLon >= 90 && userLon <= 180) {
    basin = 'South Pacific & Australian Basin (BOM / Fiji Met)';
    stormType = 'Severe Tropical Cyclone';
    agency = 'Bureau of Meteorology (BOM)';
    warningSignal = 'Category 5 Cyclone Warning';
    defaultCategory = 'STY';
    stormName = `Cyclone ${cleanCity.toUpperCase()}`;
    intlName = `SPAC-${Math.abs(Math.round(userLat * 10))}`;
  }
  // South-West Indian Ocean (Madagascar, Mauritius, Reunion, Mozambique)
  else if (!isNorthern && userLon >= 20 && userLon < 90) {
    basin = 'South-West Indian Ocean (Météo-France RSMC)';
    stormType = 'Very Intense Tropical Cyclone';
    agency = 'Météo-France La Réunion';
    warningSignal = 'Alerte Rouge Cyclonique';
    defaultCategory = 'STY';
    stormName = `Cyclone ${cleanCity.toUpperCase()}`;
    intlName = `SWIO-${Math.abs(Math.round(userLat * 10))}`;
  }
  // European & Mediterranean System / Mid-latitudes (UK, France, Germany, Mediterranean, etc.)
  else if (isNorthern && absLat >= 35 && userLon >= -30 && userLon <= 45) {
    basin = 'North Atlantic & European Maritime Basin';
    stormType = 'Severe Extratropical Cyclone / Storm';
    agency = 'EUMETNET / Met Office';
    warningSignal = 'Red Storm Warning • Severe Gale Force 11-12';
    defaultCategory = 'TY';
    stormName = `Storm ${cleanCity.toUpperCase()}`;
    intlName = `EU-${Math.abs(Math.round(userLat * 10))}`;
  }
  // Other Global Regions
  else {
    basin = 'Regional Severe Atmospheric Surveillance';
    stormType = 'Severe Cyclone / Vortex System';
    agency = 'Global Meteorological Center';
    warningSignal = 'Severe Gale & Storm Warning';
    defaultCategory = 'TY';
    stormName = `Cyclone ${cleanCity.toUpperCase()}`;
    intlName = `GLO-${Math.abs(Math.round(userLat * 10))}`;
  }

  // 2. Realistic Physics & Atmospheric Steering Flow Vectors
  // Tropical easterly trade wind flow vs Mid-latitude westerly jet stream flow
  const isTropical = absLat <= 32;
  const latDrift = isTropical
    ? (isNorthern ? 0.65 : -0.65) // Tropical storms drift poleward (North in NH, South in SH)
    : (isNorthern ? 0.45 : -0.45);
  
  const lonDrift = isTropical
    ? -1.1 // Tropical storms track westward
    : 1.4; // Mid-latitude storms track eastward

  // Place initial eye at hour 0 within active direct tracking range of user's city
  // Upstream anchor
  const initialLat = userLat - (isTropical ? (isNorthern ? 1.8 : -1.8) : (isNorthern ? 2.2 : -2.2));
  const initialLon = userLon - (isTropical ? -3.2 : 4.0);

  const points: StormTrackPoint[] = [];
  const totalHours = [-48, -36, -24, -12, -6, 0, 12, 24, 48, 72, 96];

  totalHours.forEach((hour) => {
    const isPast = hour < 0;
    const isEye = hour === 0;
    const isForecast = hour > 0;

    const latOffset = (hour / 12) * latDrift + (hour > 0 ? (hour / 24) * 0.35 : 0);
    const lonOffset = (hour / 12) * lonDrift;

    const lat = initialLat + latOffset;
    const lng = initialLon + lonOffset;

    let cat: StormCategory = defaultCategory;
    let windKmh = 195;
    let pressure = 925;

    if (hour <= -36) {
      cat = 'TS';
      windKmh = 85;
      pressure = 992;
    } else if (hour <= -24) {
      cat = 'STS';
      windKmh = 115;
      pressure = 978;
    } else if (hour <= -12) {
      cat = 'TY';
      windKmh = 165;
      pressure = 950;
    } else if (hour <= 0) {
      cat = defaultCategory;
      windKmh = defaultCategory === 'CAT5' || defaultCategory === 'STY' ? 220 : 180;
      pressure = 918;
    } else if (hour <= 24) {
      cat = 'TY';
      windKmh = 155;
      pressure = 955;
    } else if (hour <= 48) {
      cat = 'STS';
      windKmh = 110;
      pressure = 980;
    } else {
      cat = 'TS';
      windKmh = 75;
      pressure = 996;
    }

    let timeLabel = '';
    if (isPast) timeLabel = `T${hour}h (Observed)`;
    else if (isEye) timeLabel = `Present (ACTIVE EYE)`;
    else timeLabel = `+${hour}h Projected Track`;

    points.push({
      time: timeLabel,
      hourOffset: hour,
      lat: Number(lat.toFixed(2)),
      lng: Number(lng.toFixed(2)),
      category: cat,
      windKmh,
      windKnots: Math.round(windKmh / 1.852),
      gustsKmh: Math.round(windKmh * 1.25),
      pressureHpa: pressure,
      movement: isTropical 
        ? (isNorthern ? 'WNW at 22 km/h' : 'WSW at 20 km/h')
        : (isNorthern ? 'ENE at 45 km/h' : 'ESE at 40 km/h'),
      isForecast,
      forecastConeRadiusKm: isForecast ? (hour / 12) * 45 + 40 : undefined,
      galeRadiusKm: 190,
      stormRadiusKm: 95,
      bulletinNote: isEye
        ? `Active eye situated ${calculateDistanceKm(userLat, userLon, lat, lng)} km from ${cleanCity}`
        : isForecast
        ? `Projected track heading across ${cleanCity} sector threat envelope`
        : `Tracked oceanic history and radar signature`,
    });
  });

  return {
    id: `dynamic-regional-${locationName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    name: stormName,
    intlName: `${cleanCity} Active Threat Corridor`,
    basin,
    status: `${stormType} • Live Tracking`,
    currentCategory: defaultCategory,
    maxWindsKmh: defaultCategory === 'CAT5' || defaultCategory === 'STY' ? 220 : 180,
    peakGustsKmh: defaultCategory === 'CAT5' || defaultCategory === 'STY' ? 275 : 225,
    centralPressureHpa: 918,
    movement: isTropical 
      ? (isNorthern ? 'WNW at 22 km/h' : 'WSW at 20 km/h')
      : (isNorthern ? 'ENE at 45 km/h' : 'ESE at 40 km/h'),
    warningSignal,
    track: points,
  };
}

// Preset Historical Mega-Storms for reference tracking
const GLOBAL_PRESET_STORMS: TropicalCyclone[] = [
  {
    id: 'pepito-super-typhoon',
    name: 'Super Typhoon PEPITO',
    intlName: 'MAN-YI',
    basin: 'Western Pacific (PAGASA PAR)',
    status: 'Category 5 Super Typhoon Track',
    currentCategory: 'STY',
    maxWindsKmh: 195,
    peakGustsKmh: 240,
    centralPressureHpa: 920,
    movement: 'WNW at 25 km/h',
    warningSignal: 'TCWS Signal #5 (Catastrophic Winds)',
    track: [
      { time: 'T-36h', hourOffset: -36, lat: 9.8, lng: 136.2, category: 'TS', windKmh: 85, windKnots: 45, gustsKmh: 105, pressureHpa: 994, movement: 'WNW at 30 km/h', bulletinNote: 'Formed in open Philippine Sea' },
      { time: 'T-24h', hourOffset: -24, lat: 11.2, lng: 132.8, category: 'STS', windKmh: 110, windKnots: 60, gustsKmh: 135, pressureHpa: 980, movement: 'WNW at 25 km/h', bulletinNote: 'Rapid intensification' },
      { time: 'T-12h', hourOffset: -12, lat: 12.8, lng: 128.5, category: 'TY', windKmh: 155, windKnots: 85, gustsKmh: 190, pressureHpa: 955, movement: 'WNW at 25 km/h', bulletinNote: 'Upgraded to Typhoon' },
      { time: 'T-6h', hourOffset: -6, lat: 13.9, lng: 125.4, category: 'STY', windKmh: 195, windKnots: 105, gustsKmh: 240, pressureHpa: 920, movement: 'WNW at 25 km/h', bulletinNote: 'Super Typhoon intensity' },
      { time: 'Present Eye', hourOffset: 0, lat: 15.6, lng: 122.1, category: 'STY', windKmh: 195, windKnots: 105, gustsKmh: 240, pressureHpa: 925, movement: 'NW at 25 km/h', bulletinNote: 'Active Eye approaching Luzon coast' },
      { time: '+12h Forecast', hourOffset: 12, lat: 16.8, lng: 119.2, category: 'TY', windKmh: 140, windKnots: 75, gustsKmh: 170, pressureHpa: 970, movement: 'WNW at 25 km/h', isForecast: true, forecastConeRadiusKm: 65, bulletinNote: 'Emerging over West Philippine Sea' },
      { time: '+24h Forecast', hourOffset: 24, lat: 17.5, lng: 116.8, category: 'STS', windKmh: 110, windKnots: 60, gustsKmh: 135, pressureHpa: 985, movement: 'WNW at 20 km/h', isForecast: true, forecastConeRadiusKm: 110, bulletinNote: 'Tracking towards Hainan / Vietnam' },
      { time: '+48h Forecast', hourOffset: 48, lat: 18.5, lng: 112.0, category: 'TS', windKmh: 75, windKnots: 40, gustsKmh: 90, pressureHpa: 998, movement: 'WSW at 15 km/h', isForecast: true, forecastConeRadiusKm: 200, bulletinNote: 'Dissipating over South China Sea' },
    ],
  },
  {
    id: 'milton-major-hurricane',
    name: 'Hurricane MILTON',
    intlName: 'MILTON (Atlantic/Gulf)',
    basin: 'Gulf of Mexico / Atlantic',
    status: 'Category 5 Rapid Intensifier',
    currentCategory: 'CAT5',
    maxWindsKmh: 285,
    peakGustsKmh: 340,
    centralPressureHpa: 897,
    movement: 'ENE at 26 km/h',
    warningSignal: 'Hurricane Warning • Storm Surge Emergency',
    track: [
      { time: 'T-48h', hourOffset: -48, lat: 21.8, lng: -93.2, category: 'TS', windKmh: 95, windKnots: 50, gustsKmh: 115, pressureHpa: 990, movement: 'E at 15 km/h', bulletinNote: 'Southwestern Gulf of Mexico' },
      { time: 'T-24h', hourOffset: -24, lat: 22.3, lng: -89.8, category: 'CAT3', windKmh: 195, windKnots: 105, gustsKmh: 240, pressureHpa: 940, movement: 'E at 20 km/h', bulletinNote: 'Explosive deepening north of Yucatan' },
      { time: 'Present Eye', hourOffset: 0, lat: 24.2, lng: -86.5, category: 'CAT5', windKmh: 285, windKnots: 155, gustsKmh: 340, pressureHpa: 897, movement: 'ENE at 26 km/h', bulletinNote: 'Peak explosive intensity in eastern Gulf' },
      { time: '+12h Forecast', hourOffset: 12, lat: 26.8, lng: -83.1, category: 'CAT4', windKmh: 220, windKnots: 120, gustsKmh: 270, pressureHpa: 935, movement: 'ENE at 28 km/h', isForecast: true, forecastConeRadiusKm: 55, bulletinNote: 'Approaching Tampa Bay / Sarasota landfall' },
      { time: '+24h Forecast', hourOffset: 24, lat: 28.5, lng: -79.5, category: 'CAT2', windKmh: 160, windKnots: 85, gustsKmh: 195, pressureHpa: 965, movement: 'ENE at 32 km/h', isForecast: true, forecastConeRadiusKm: 110, bulletinNote: 'Crossing into Western Atlantic' },
      { time: '+48h Forecast', hourOffset: 48, lat: 31.0, lng: -70.0, category: 'TS', windKmh: 100, windKnots: 55, gustsKmh: 125, pressureHpa: 985, movement: 'ENE at 35 km/h', isForecast: true, forecastConeRadiusKm: 210, bulletinNote: 'Post-tropical transition over open Atlantic' },
    ],
  },
];

// Helper to center the map viewport dynamically
function AutoCenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface PagasaTyphoonMapProps {
  lat: number;
  lon: number;
  name: string;
  isExpanded?: boolean;
  settings?: AppSettings;
}

export function PagasaTyphoonMap({ lat, lon, name, isExpanded, settings }: PagasaTyphoonMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  // Generate local regional storm specifically relative to user's location
  const regionalStorm = useMemo(() => {
    return generateRegionalStormTrack(lat, lon, name);
  }, [lat, lon, name]);

  const allStorms = useMemo(() => {
    return [regionalStorm, ...GLOBAL_PRESET_STORMS];
  }, [regionalStorm]);

  const [selectedStormId, setSelectedStormId] = useState<string>(regionalStorm.id);
  const [showCone, setShowCone] = useState(true);
  const [showRadii, setShowRadii] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => mapRef.current?.invalidateSize(), 350);
    return () => window.clearTimeout(resizeTimer);
  }, [isExpanded]);

  // Timeline scrubber & animation playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number | null>(null);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);

  // Automatically track and lock onto the storm for the new location whenever dashboard city changes
  useEffect(() => {
    setSelectedStormId(regionalStorm.id);
    setCurrentStepIdx(null);
    setIsPlaying(false);
  }, [regionalStorm.id]);

  const activeStorm = useMemo(() => {
    return allStorms.find((s) => s.id === selectedStormId) || regionalStorm;
  }, [allStorms, selectedStormId, regionalStorm]);

  // Determine index of present eye (hourOffset === 0)
  const eyeIndex = useMemo(() => {
    const idx = activeStorm.track.findIndex((p) => p.hourOffset === 0);
    return idx !== -1 ? idx : Math.floor(activeStorm.track.length / 2);
  }, [activeStorm]);

  const activePointIdx = currentStepIdx !== null ? currentStepIdx : eyeIndex;
  const activePoint = activeStorm.track[activePointIdx] || activeStorm.track[0];

  // Real-time distance and compass bearing from user's current city to storm position
  const distanceToStorm = useMemo(() => {
    return calculateDistanceKm(lat, lon, activePoint.lat, activePoint.lng);
  }, [lat, lon, activePoint.lat, activePoint.lng]);

  const bearingToStorm = useMemo(() => {
    return calculateCompassBearing(lat, lon, activePoint.lat, activePoint.lng);
  }, [lat, lon, activePoint.lat, activePoint.lng]);

  // RainViewer real-time radar integration
  useEffect(() => {
    async function loadRadarTiles() {
      try {
        const res = await fetch('/api/radar');
        const data = await res.json();
        if (data.radar && data.radar.past && data.radar.past.length > 0) {
          const latest = data.radar.past[data.radar.past.length - 1];
          setRadarUrl(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      } catch (err) {
        console.warn('Radar fetch failed', err);
      }
    }
    loadRadarTiles();
  }, []);

  // Animation timeline loop for route playback
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIdx((prev) => {
          const next = (prev === null ? 0 : prev) + 1;
          if (next >= activeStorm.track.length) {
            setIsPlaying(false);
            return eyeIndex;
          }
          return next;
        });
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeStorm.track.length, eyeIndex]);

  // Compute forecast probability cone polygon
  const conePolygonCoords = useMemo(() => {
    return generateForecastConePolygon(activeStorm.track, eyeIndex);
  }, [activeStorm, eyeIndex]);

  // Past track vs Forecast track lines
  const pastTrackPoints = useMemo(() => {
    return activeStorm.track.slice(0, eyeIndex + 1).map((p) => [p.lat, p.lng] as [number, number]);
  }, [activeStorm, eyeIndex]);

  const forecastTrackPoints = useMemo(() => {
    return activeStorm.track.slice(eyeIndex).map((p) => [p.lat, p.lng] as [number, number]);
  }, [activeStorm, eyeIndex]);

  // Center view on active storm eye or user location
  const mapCenter = useMemo<[number, number]>(() => {
    return [(activePoint.lat + lat) / 2, (activePoint.lng + lon) / 2];
  }, [activePoint.lat, activePoint.lng, lat, lon]);

  return (
    <div className="relative w-full h-full min-h-[360px] flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* Top HUD: Meteorological Storm Advisory & Track Telemetry Bar */}
      <div className="relative order-2 z-[1000] flex flex-col pointer-events-none flex-none h-11 p-1 bg-slate-950 overflow-visible">
        
        {/* Main Advisory Banner */}
        <div
          className="h-full flex flex-nowrap items-center justify-between gap-2 pointer-events-auto bg-slate-950/90 px-1.5 rounded-lg border border-sky-500/40 shadow-lg cursor-pointer"
          onClick={() => setIsRouteDropdownOpen(!isRouteDropdownOpen)}
        >
          
          {/* Category Badge & Storm Title */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[9px] shadow ring-1 ring-white/20"
                style={{ backgroundColor: getStormCategoryColor(activePoint.category) }}
              >
                {activePoint.category}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px]">
                🌀
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-widest text-sky-400 uppercase">
                  TROPICAL CYCLONE TRACK BULLETIN
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40 font-mono">
                  {activeStorm.warningSignal}
                </span>
              </div>
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{activeStorm.name}</span>
                <span className="text-xs text-slate-400 font-normal">({activeStorm.intlName})</span>
              </div>
            </div>
          </div>

          {/* Controls: Storm Select & Layer Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold">{isRouteDropdownOpen ? 'Hide options' : 'Show options'}</span>
            {isRouteDropdownOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </div>

          {isRouteDropdownOpen && <div className="absolute bottom-full right-0 flex min-w-[280px] max-w-[calc(100vw-1rem)] flex-col items-stretch gap-1.5 p-1.5 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-end gap-1.5">
              <select
              value={selectedStormId}
              onChange={(e) => {
                setSelectedStormId(e.target.value);
                setCurrentStepIdx(null);
                setIsPlaying(false);
              }}
              className="h-7 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] rounded-md px-2 py-1 font-medium focus:outline-none focus:border-sky-400 max-w-[150px] truncate"
            >
              {allStorms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currentCategory})
                </option>
              ))}
              </select>

            {/* Quick Layer Buttons */}
              <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-[10px] font-medium">
              <button
                onClick={() => setShowCone(!showCone)}
                title="Toggle 70% Probability Forecast Error Cone"
                className={`px-2 py-1 rounded-md transition-all ${
                  showCone ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cone
              </button>
              <button
                onClick={() => setShowRadii(!showRadii)}
                title="Toggle Gale & Storm Wind Radii"
                className={`px-2 py-1 rounded-md transition-all ${
                  showRadii ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Wind Radii
              </button>
              <button
                onClick={() => setShowRadar(!showRadar)}
                title="Toggle Doppler Rain Radar"
                className={`px-2 py-1 rounded-md transition-all ${
                  showRadar ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Radar
              </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-800 pt-1 text-[9px] text-slate-300">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 font-mono whitespace-nowrap">
                  <Wind size={11} className="text-amber-400" />
                  <span className="text-slate-400">Winds:</span>
                  <span className="text-white font-bold">{activePoint.windKmh} km/h</span>
                </div>
                <div className="flex items-center gap-1 font-mono whitespace-nowrap">
                  <ShieldAlert size={11} className="text-red-400" />
                  <span className="text-slate-400">Gusts:</span>
                  <span className="text-white font-bold">{activePoint.gustsKmh} km/h</span>
                </div>
                <div className="flex items-center gap-1 font-mono whitespace-nowrap">
                  <Gauge size={11} className="text-purple-400" />
                  <span className="text-slate-400">Pressure:</span>
                  <span className="text-white font-bold">{activePoint.pressureHpa} hPa</span>
                </div>
                <div className="flex items-center gap-1 font-mono whitespace-nowrap">
                  <Radio size={11} className="text-emerald-400" />
                  <span className="text-slate-400">Movement:</span>
                  <span className="text-white font-bold">{activePoint.movement}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sky-200">
                <MapPin size={11} className="text-emerald-400" />
                <span><b>{distanceToStorm} km</b> {bearingToStorm} of <b>{name}</b></span>
              </div>
            </div>
          </div>}
        </div>
      </div>

      {/* Leaflet Interactive Map View */}
      <div className="w-full h-full flex-1 relative order-1 min-h-0">
        <MapContainer
          ref={mapRef}
          attributionControl={false}
          center={mapCenter}
          zoom={5}
          minZoom={3}
          maxZoom={10}
          maxBounds={[[-85, -180], [85, 180]]}
          maxBoundsViscosity={1}
          worldCopyJump={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', minHeight: isExpanded ? '0' : '300px' }}
        >
          <AutoCenterMap center={mapCenter} zoom={6} />

          {/* High-Resolution Clean Dark Map Tiles (Zero API Key, Zero Watermarks) */}
          <TileLayer
            attribution='&copy; Esri &copy; OpenStreetMap'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={10}
            maxZoom={10}
            noWrap={true}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={10}
            maxZoom={10}
            noWrap={true}
            zIndex={250}
          />

          {/* Doppler Rain Radar Tile Layer */}
          {showRadar && radarUrl && (
            <TileLayer
              url={radarUrl}
              opacity={0.65}
              zIndex={300}
              maxNativeZoom={7}
              maxZoom={10}
              noWrap={true}
            />
          )}

          {/* 70% Forecast Probability Cone Polygon */}
          {showCone && conePolygonCoords.length > 0 && (
            <Polygon
              positions={conePolygonCoords}
              pathOptions={{
                color: '#ef4444',
                weight: 1.5,
                dashArray: '5, 5',
                fillColor: '#ef4444',
                fillOpacity: 0.16,
              }}
            />
          )}

          {/* Historical / Past Track Line (Solid dark polyline) */}
          <Polyline
            positions={pastTrackPoints}
            pathOptions={{
              color: '#0f172a',
              weight: 4,
              opacity: 0.95,
            }}
          />

          {/* Future / Projected Forecast Route Line (Dashed red polyline) */}
          <Polyline
            positions={forecastTrackPoints}
            pathOptions={{
              color: '#ef4444',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.85,
            }}
          />

          {/* Range Bearing Line: Connects User City directly to Active Storm Eye */}
          <Polyline
            positions={[
              [lat, lon],
              [activePoint.lat, activePoint.lng],
            ]}
            pathOptions={{
              color: '#10b981',
              weight: 1.5,
              dashArray: '4, 4',
              opacity: 0.75,
            }}
          />

          {/* Track Nodes & Waypoints */}
          {activeStorm.track.map((pt, idx) => {
            const isEye = idx === activePointIdx;
            const color = getStormCategoryColor(pt.category);

            return (
              <React.Fragment key={idx}>
                <Marker
                  position={[pt.lat, pt.lng]}
                  icon={L.divIcon({
                    className: 'bg-transparent',
                    html: isEye
                      ? `<div class="relative flex items-center justify-center">
                           <div class="absolute w-9 h-9 rounded-full animate-ping opacity-60" style="background-color: ${color}"></div>
                           <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-2xl border-2 border-white ring-2 ring-black cursor-pointer" style="background-color: ${color}">
                             🌀
                           </div>
                         </div>`
                      : `<div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform" style="background-color: ${color}"></div>`,
                    iconAnchor: isEye ? [16, 16] : [7, 7],
                  })}
                  eventHandlers={{
                    click: () => setCurrentStepIdx(idx),
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 text-xs space-y-1.5 min-w-[180px]">
                      <div className="font-bold flex items-center justify-between gap-2 border-b pb-1">
                        <span style={{ color }} className="font-extrabold">{getStormCategoryLabel(pt.category)}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{pt.time}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div>Winds: <b>{pt.windKmh} km/h</b></div>
                        <div>Gusts: <b>{pt.gustsKmh} km/h</b></div>
                        <div>Pressure: <b>{pt.pressureHpa} hPa</b></div>
                        <div>Movement: <b>{pt.movement}</b></div>
                      </div>
                      {pt.bulletinNote && (
                        <div className="text-[10px] text-slate-600 italic bg-slate-100 p-1.5 rounded border border-slate-200">
                          {pt.bulletinNote}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Wind Radii Circles (Gale Force 30kt & Storm Force 50kt rings) */}
                {isEye && showRadii && (
                  <>
                    {/* Gale force wind radius (180 km) */}
                    <Circle
                      center={[pt.lat, pt.lng]}
                      radius={180000}
                      pathOptions={{
                        color: '#f59e0b',
                        weight: 1.5,
                        dashArray: '4, 4',
                        fillColor: '#f59e0b',
                        fillOpacity: 0.08,
                      }}
                    />
                    {/* Storm force wind radius (90 km) */}
                    <Circle
                      center={[pt.lat, pt.lng]}
                      radius={90000}
                      pathOptions={{
                        color: '#ef4444',
                        weight: 2,
                        fillColor: '#ef4444',
                        fillOpacity: 0.14,
                      }}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}

          {/* User Active Search Location Marker */}
          <Marker
            position={[lat, lon]}
            icon={L.divIcon({
              className: 'bg-transparent',
              html: `<div class="relative flex items-center justify-center">
                       <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg ring-2 ring-emerald-900"></div>
                       <div class="absolute -top-5 px-2 py-0.5 bg-slate-900/90 text-emerald-300 text-[9px] font-bold rounded shadow-md border border-slate-700 whitespace-nowrap">
                         📍 ${name}
                       </div>
                     </div>`,
              iconAnchor: [8, 8],
            })}
          />
        </MapContainer>
      </div>
    </div>
  );
}
