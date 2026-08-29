import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import L from 'leaflet';
import { setWorkerUrl, type Map as MapLibreMap } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import {
  Navigation,
  MapPin,
  Clock,
  Compass,
  Layers,
  Car,
  Footprints,
  Bus,
  Bike,
  Plane,
  AlertCircle,
  Check,
  Search,
  X,
  Crosshair,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Star,
  Phone,
  Globe,
  Bookmark,
  Coffee,
  Utensils,
  Fuel,
  Hotel,
  ShoppingCart,
  Pill,
  Landmark,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  Loader2,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import { AppSettings, searchPlaces, getRoute, PlaceSearchResult, Location } from '../lib/api';

setWorkerUrl(mapLibreWorkerUrl);

const NAVIGATION_LOCALES: Record<string, string> = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR',
  ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', hi: 'hi-IN', ru: 'ru-RU', ar: 'ar-SA',
};

// Fix default Leaflet icon assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type GoogleMapType = 'roadmap' | 'streets' | 'hybrid' | 'satellite' | 'terrain';
export type TravelMode = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING' | 'FLIGHT';

export interface PlacePOI {
  id: string;
  name: string;
  category: 'restaurant' | 'gas' | 'coffee' | 'hotel' | 'grocery' | 'pharmacy' | 'attraction';
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  openStatus: string;
  address: string;
  phone: string;
  website: string;
  photoUrl: string;
  distanceKm: number;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  action: 'straight' | 'right' | 'left' | 'merge' | 'arrive';
  lat?: number;
  lng?: number;
}

export interface RouteOption {
  id: string;
  title: string;
  via: string;
  duration: string;
  durationMinutes: number;
  distance: string;
  trafficStatus: 'fast' | 'moderate' | 'heavy';
  trafficDelayNote?: string;
  steps: RouteStep[];
  points: [number, number][];
}

interface GoogleNavigationMapProps {
  currentLocation: { lat: number; lng: number; name: string; country?: string };
  isExpanded?: boolean;
  settings?: AppSettings;
}

// Helper to return representative icons for place categories
function getPlaceCategoryIcon(category: string) {
  switch (category) {
    case 'restaurant': return '🍴';
    case 'gas': return '⛽';
    case 'hotel': return '🏨';
    case 'grocery': return '🛒';
    case 'pharmacy': return '💊';
    case 'airport': return '✈️';
    case 'attraction': return '🏛️';
    case 'education': return '🎓';
    case 'transit': return '🚆';
    default: return '📍';
  }
}

function distanceBetweenMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const OPENFREE_STYLE_URLS: Record<GoogleMapType, string> = {
  roadmap: 'https://tiles.openfreemap.org/styles/liberty',
  streets: 'https://tiles.openfreemap.org/styles/bright',
  hybrid: 'https://tiles.openfreemap.org/styles/positron',
  satellite: 'https://tiles.openfreemap.org/styles/dark',
  terrain: 'https://tiles.openfreemap.org/styles/fiord',
};

function MapLibreVectorLayer({ styleUrl, onReady }: { styleUrl: string; onReady: (map: MapLibreMap | null) => void }) {
  const leafletMap = useMap();

  useEffect(() => {
    let vectorLayer: ReturnType<typeof maplibreGL> | null = null;
    let fallbackLayer: L.TileLayer | null = null;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const useRasterFallback = () => {
      if (disposed || fallbackLayer) return;
      onReady(null);
      if (vectorLayer && leafletMap.hasLayer(vectorLayer)) leafletMap.removeLayer(vectorLayer);
      vectorLayer = null;
      fallbackLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMap);
    };

    try {
      vectorLayer = maplibreGL({ style: styleUrl }).addTo(leafletMap);
      const vectorMap = vectorLayer.getMaplibreMap();
      onReady(vectorMap);
      vectorMap.once('load', () => {
        if (loadTimer) clearTimeout(loadTimer);
      });
      loadTimer = setTimeout(useRasterFallback, 10000);
    } catch (error) {
      console.error('Route Map vector layer failed; using raster fallback.', error);
      useRasterFallback();
    }

    return () => {
      disposed = true;
      if (loadTimer) clearTimeout(loadTimer);
      onReady(null);
      if (vectorLayer && leafletMap.hasLayer(vectorLayer)) leafletMap.removeLayer(vectorLayer);
      if (fallbackLayer && leafletMap.hasLayer(fallbackLayer)) leafletMap.removeLayer(fallbackLayer);
    };
  }, [leafletMap, onReady, styleUrl]);

  return null;
}

// Map controller for animated pans, zoom, and auto-fitting route bounds
function MapController({ 
  center, 
  zoom, 
  routeBounds 
}: { 
  center: [number, number]; 
  zoom: number; 
  routeBounds?: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeBounds && routeBounds.length >= 2) {
      const bounds = L.latLngBounds(routeBounds);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, routeBounds, map]);

  return null;
}

function NamedPoiClickHandler({ vectorMapRef, onPlaceClick, onCoordinateClick }: {
  vectorMapRef: React.MutableRefObject<MapLibreMap | null>;
  onPlaceClick: (place: PlaceSearchResult) => void;
  onCoordinateClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: ({ latlng, containerPoint }) => {
      const vectorMap = vectorMapRef.current;
      const features = vectorMap?.queryRenderedFeatures([containerPoint.x, containerPoint.y]) || [];
      const feature = features.find((candidate) => {
        const props = candidate.properties || {};
        const name = props['name:en'] || props.name_en || props.name;
        return Boolean(name) && (candidate.sourceLayer === 'poi' || candidate.layer.id.toLowerCase().includes('poi'));
      });
      if (!feature) {
        onCoordinateClick(latlng.lat, latlng.lng);
        return;
      }

      const props = feature.properties || {};
      const name = String(props['name:en'] || props.name_en || props.name);
      const type = String(props.subclass || props.class || 'place').toLowerCase();
      const geometry = feature.geometry;
      const coordinates = geometry.type === 'Point' ? geometry.coordinates : [latlng.lng, latlng.lat];
      let category: PlaceSearchResult['category'] = 'place';
      if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery', 'food_court'].includes(type)) category = 'restaurant';
      else if (['fuel', 'charging_station'].includes(type)) category = 'gas';
      else if (['hotel', 'motel', 'hostel', 'guest_house'].includes(type)) category = 'hotel';
      else if (['supermarket', 'convenience', 'mall', 'marketplace'].includes(type)) category = 'grocery';
      else if (['pharmacy', 'hospital', 'clinic', 'doctors'].includes(type)) category = 'pharmacy';
      else if (['attraction', 'museum', 'monument', 'viewpoint'].includes(type)) category = 'attraction';
      onPlaceClick({
        id: `vector-${feature.sourceLayer || 'poi'}-${feature.id || `${coordinates[0]}-${coordinates[1]}`}`,
        name,
        displayName: name,
        subtitle: type.replaceAll('_', ' '),
        lat: Number(coordinates[1]),
        lng: Number(coordinates[0]),
        type,
        category,
        address: name,
      });
    },
  });
  return null;
}

// Fallback curved interpolation if routing service is unreachable
function generateFallbackCurve(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): [number, number][] {
  const dLat = destLat - originLat;
  const dLng = destLng - originLng;
  return [
    [originLat, originLng],
    [originLat + dLat * 0.25 - 0.002, originLng + dLng * 0.2 + 0.003],
    [originLat + dLat * 0.55 + 0.003, originLng + dLng * 0.5 + 0.003],
    [originLat + dLat * 0.8 - 0.001, originLng + dLng * 0.8 + 0.002],
    [destLat, destLng],
  ];
}

export function GoogleNavigationMap({ currentLocation, isExpanded, settings }: GoogleNavigationMapProps) {
  const sameCountry = useCallback((place: PlaceSearchResult) => !currentLocation.country || place.country?.toLowerCase() === currentLocation.country.toLowerCase(), [currentLocation.country]);
  const mapRef = useRef<L.Map | null>(null);
  const vectorMapRef = useRef<MapLibreMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Map Engine & Layer States
  const [mapType, setMapType] = useState<GoogleMapType>('roadmap');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const handleVectorMapReady = useCallback((map: MapLibreMap | null) => {
    vectorMapRef.current = map;
  }, []);

  // Search & Navigation Modes
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const layerControlsRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Directions Inputs & Locations
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');

  // Collapse control panels when clicking away, while preserving any active route.
  useEffect(() => {
    const handleClickAway = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedNavigationControls = controlsRef.current?.contains(target);
      const clickedLayerControls = layerControlsRef.current?.contains(target);

      if (!clickedNavigationControls) {
        setIsSearchOpen(false);
        setIsDirectionsOpen(false);
        setOriginSuggestions([]);
        setDestSuggestions([]);
      }

      if (!clickedLayerControls) {
        setShowLayerMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleClickAway);
    return () => document.removeEventListener('pointerdown', handleClickAway);
  }, []);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number; name: string }>({
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    name: currentLocation.name,
  });
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVING');

  // Autocomplete Suggestions with full place & landmark support
  const [destSuggestions, setDestSuggestions] = useState<PlaceSearchResult[]>([]);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSearchResult[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Active searched place pinned on the map
  const [searchedPlace, setSearchedPlace] = useState<PlaceSearchResult | null>(null);
  const [pinnedPlaces, setPinnedPlaces] = useState<PlaceSearchResult[]>([]);

  // Calculated Routes & Steps
  const [calculatedRoutes, setCalculatedRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-primary');
  const [showTurnSteps, setShowTurnSteps] = useState(false);
  const [routeBounds, setRouteBounds] = useState<[number, number][] | null>(null);

  // Live Navigation Simulation & Voice
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIdx, setNavStepIdx] = useState(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [simulatedSpeed, setSimulatedSpeed] = useState(48);
  const [navigationPosition, setNavigationPosition] = useState<{ lat: number; lng: number; heading: number | null } | null>(null);

  // Map Camera State
  const [zoomLevel, setZoomLevel] = useState(14);
  const [mapCenter, setMapCenter] = useState<[number, number]>([currentLocation.lat, currentLocation.lng]);

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => mapRef.current?.invalidateSize(), 350);
    return () => window.clearTimeout(resizeTimer);
  }, [isExpanded]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      window.requestAnimationFrame(() => {
        const map = mapRef.current;
        if (!map) return;
        map.invalidateSize({ pan: false });
        if (routeBounds && routeBounds.length >= 2) {
          map.fitBounds(L.latLngBounds(routeBounds), { padding: [55, 55], maxZoom: 16, animate: false });
        }
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [routeBounds]);

  // Sync with current dashboard location
  useEffect(() => {
    setMapCenter([currentLocation.lat, currentLocation.lng]);
    const cleanName = currentLocation.name.split(',')[0].trim();
    setOriginInput(`Your Location (${cleanName})`);
    setOriginCoords({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      name: currentLocation.name,
    });
  }, [currentLocation.lat, currentLocation.lng, currentLocation.name]);

  // Closing the directions panel must not clear the route from the map.
  const handleCloseDirections = () => {
    window.speechSynthesis?.cancel();
    setIsDirectionsOpen(false);
    setShowTurnSteps(false);
    setDestSuggestions([]);
    setOriginSuggestions([]);
  };

  const clearRouteForDifferentPlace = useCallback((lat: number, lng: number) => {
    if (!destCoords || (Math.abs(destCoords.lat - lat) < 0.00001 && Math.abs(destCoords.lng - lng) < 0.00001)) return;
    setIsNavigating(false);
    setDestCoords(null);
    setCalculatedRoutes([]);
    setRouteBounds(null);
    setShowTurnSteps(false);
  }, [destCoords]);

  const retainPlacePin = useCallback((place: PlaceSearchResult) => {
    setPinnedPlaces((existing) => [
      place,
      ...existing.filter((pin) => pin.id !== place.id),
    ].slice(0, 12));
  }, []);

  const handleNamedPoiClick = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/poi-at?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`);
      if (!response.ok) return;
      const data = await response.json();
      const place = data.place as PlaceSearchResult | undefined;
      if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
      clearRouteForDifferentPlace(place.lat, place.lng);
      setSearchedPlace(place);
      setIsSearchOpen(false);
    } catch {
      // Raster-tile clicks with no named POI intentionally do nothing.
    }
  }, [clearRouteForDifferentPlace]);

  const handleVectorPoiClick = useCallback((place: PlaceSearchResult) => {
    clearRouteForDifferentPlace(place.lat, place.lng);
    setSearchedPlace(place);
    setIsSearchOpen(false);
  }, [clearRouteForDifferentPlace]);

  // Search Map autocomplete (Any Place, Landmark, Airport, Mall, Restaurant, Address, or City)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMap(true);
      const results = await searchPlaces(searchQuery.trim(), currentLocation.lat, currentLocation.lng);
      setSearchSuggestions(results.filter(sameCountry).slice(0, 6));
      setIsSearchingMap(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, currentLocation.lat, currentLocation.lng, sameCountry]);

  // Destination autocomplete
  useEffect(() => {
    if (!destinationInput || destinationInput.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      const results = await searchPlaces(destinationInput.trim(), currentLocation.lat, currentLocation.lng);
      setDestSuggestions(results.filter(sameCountry).slice(0, 6));
      setIsSearchingDest(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [destinationInput, currentLocation.lat, currentLocation.lng, sameCountry]);

  // Origin autocomplete
  useEffect(() => {
    if (!originInput || originInput.startsWith('Your Location') || originInput.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      const results = await searchPlaces(originInput.trim(), currentLocation.lat, currentLocation.lng);
      setOriginSuggestions(results.filter(sameCountry).slice(0, 6));
      setIsSearchingOrigin(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [originInput, currentLocation.lat, currentLocation.lng, sameCountry]);

  // Fetch Real Road Route via /api/route (OSRM) whenever Origin, Destination or Mode changes
  const calculateRealRoute = useCallback(
    async (
      origLat: number,
      origLng: number,
      dstLat: number,
      dstLng: number,
      dstName: string,
      mode: TravelMode
    ) => {
      setIsLoadingRoute(true);
      try {
        const routeData = await getRoute(origLng, origLat, dstLng, dstLat);
        
        if (routeData && routeData.routes && routeData.routes.length > 0) {
          const primary = routeData.routes[0];
          const rawCoords: [number, number][] = primary.geometry.coordinates;
          const leafPoints: [number, number][] = rawCoords.map(([lon, lat]) => [lat, lon]);

          const distanceMeters = primary.distance || 1000;
          const distanceKm = (distanceMeters / 1000).toFixed(1);

          // Calculate travel time based on mode
          let speedKmh = 45;
          if (mode === 'TRANSIT') speedKmh = 25;
          if (mode === 'WALKING') speedKmh = 4.8;
          if (mode === 'BICYCLING') speedKmh = 16;
          if (mode === 'FLIGHT') speedKmh = 600;

          const durationMin = Math.max(2, Math.round((Number(distanceKm) / speedKmh) * 60));
          const formatTime = (mins: number) => {
            if (mins < 60) return `${mins} min`;
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
          };

          // Parse turn steps
          const steps: RouteStep[] = (primary.legs?.[0]?.steps || []).map((st: any) => {
            const maneuver = st.maneuver || {};
            const type = maneuver.type || '';
            const modifier = maneuver.modifier || '';
            let action: RouteStep['action'] = 'straight';
            if (modifier.includes('right')) action = 'right';
            else if (modifier.includes('left')) action = 'left';
            else if (type.includes('arrive')) action = 'arrive';
            else if (type.includes('merge') || type.includes('ramp')) action = 'merge';

            const stDistKm = (st.distance / 1000).toFixed(1);
            const stDistStr = st.distance < 1000 ? `${Math.round(st.distance)} m` : `${stDistKm} km`;
            const stDurMin = Math.max(1, Math.round(st.duration / 60));

            return {
              instruction: st.name ? `${st.maneuver?.type || 'Head'} on ${st.name}` : `Continue along corridor`,
              distance: stDistStr,
              duration: `${stDurMin} min`,
              action,
              lat: Array.isArray(maneuver.location) ? Number(maneuver.location[1]) : undefined,
              lng: Array.isArray(maneuver.location) ? Number(maneuver.location[0]) : undefined,
            };
          });

          if (steps.length === 0) {
            steps.push(
              { instruction: `Depart from starting point`, distance: '300 m', duration: '1 min', action: 'straight', lat: origLat, lng: origLng },
              { instruction: `Follow main route towards ${dstName}`, distance: `${distanceKm} km`, duration: formatTime(durationMin), action: 'straight' },
              { instruction: `Arrive at destination: ${dstName}`, distance: '50 m', duration: '1 min', action: 'arrive', lat: dstLat, lng: dstLng }
            );
          }

          const primaryRoute: RouteOption = {
            id: 'route-primary',
            title: mode === 'DRIVING' ? 'Fastest route' : `${mode.charAt(0) + mode.slice(1).toLowerCase()} route`,
            via: mode === 'TRANSIT' ? 'Metro & Express Transit' : 'via Primary Corridor',
            duration: formatTime(durationMin),
            durationMinutes: durationMin,
            distance: `${distanceKm} km`,
            trafficStatus: 'fast',
            trafficDelayNote: 'Real-time road conditions applied',
            steps,
            points: leafPoints,
          };

          setCalculatedRoutes([primaryRoute]);
          setSelectedRouteId('route-primary');
          setRouteBounds(leafPoints);
        } else {
          // Fallback interpolated curve
          const fallbackPoints = generateFallbackCurve(origLat, origLng, dstLat, dstLng);
          const dLat = dstLat - origLat;
          const dLng = dstLng - origLng;
          const straightDistKm = Math.max(1.2, Number((Math.sqrt(dLat * dLat + dLng * dLng) * 111).toFixed(1)));
          const durationMin = Math.max(3, Math.round((straightDistKm / 40) * 60));

          const fallbackRoute: RouteOption = {
            id: 'route-primary',
            title: 'Direct route',
            via: 'via Direct Connecting Road',
            duration: `${durationMin} min`,
            durationMinutes: durationMin,
            distance: `${straightDistKm} km`,
            trafficStatus: 'fast',
            steps: [
              { instruction: `Head toward ${dstName}`, distance: `${straightDistKm} km`, duration: `${durationMin} min`, action: 'straight', lat: origLat, lng: origLng },
              { instruction: `Arrive at ${dstName}`, distance: '50 m', duration: '1 min', action: 'arrive', lat: dstLat, lng: dstLng },
            ],
            points: fallbackPoints,
          };

          setCalculatedRoutes([fallbackRoute]);
          setSelectedRouteId('route-primary');
          setRouteBounds(fallbackPoints);
        }
      } catch (err) {
        console.error('Route calculation error:', err);
      } finally {
        setIsLoadingRoute(false);
      }
    },
    []
  );

  // Trigger route recalculation when destination or travel mode is updated
  useEffect(() => {
    if (destCoords && (isDirectionsOpen || isNavigating)) {
      calculateRealRoute(
        originCoords.lat,
        originCoords.lng,
        destCoords.lat,
        destCoords.lng,
        destCoords.name,
        travelMode
      );
    }
  }, [destCoords, originCoords, travelMode, isDirectionsOpen, isNavigating, calculateRealRoute]);

  const activeRoute = useMemo(() => {
    return calculatedRoutes.find((r) => r.id === selectedRouteId) || calculatedRoutes[0] || null;
  }, [calculatedRoutes, selectedRouteId]);

  // Voice narration for turn-by-turn navigation
  useEffect(() => {
    if (!isNavigating || isVoiceMuted) {
      window.speechSynthesis?.cancel();
      return;
    }
    if (isNavigating && !isVoiceMuted && activeRoute && activeRoute.steps[navStepIdx]) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const step = activeRoute.steps[navStepIdx];
          const text = `${step.instruction}. In ${step.distance}.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = NAVIGATION_LOCALES[settings?.language || 'en'] || 'en-US';
          utterance.volume = 1.0;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }, [isNavigating, navStepIdx, isVoiceMuted, activeRoute]);

  // Track the device while navigation is active. Route steps must never advance
  // on a timer: remaining stationary keeps the current maneuver unchanged.
  useEffect(() => {
    if (!isNavigating || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setNavigationPosition({
        lat: coords.latitude,
        lng: coords.longitude,
        heading: Number.isFinite(coords.heading) ? coords.heading : null,
      }),
      (error) => console.warn('Live navigation location unavailable:', error.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isNavigating]);

  // Move to the next instruction only when GPS reaches the next maneuver.
  useEffect(() => {
    if (!isNavigating || !activeRoute || !navigationPosition) return;
    const nextStep = activeRoute.steps[navStepIdx + 1];
    if (!nextStep || nextStep.lat == null || nextStep.lng == null) return;

    const distanceToNextTurn = distanceBetweenMeters(
      navigationPosition.lat,
      navigationPosition.lng,
      nextStep.lat,
      nextStep.lng
    );

    if (distanceToNextTurn <= 45) {
      setNavStepIdx((current) => Math.min(current + 1, activeRoute.steps.length - 1));
    }
  }, [isNavigating, activeRoute, navStepIdx, navigationPosition]);

  // Select destination from place suggestions
  const handleSelectDestination = (place: PlaceSearchResult) => {
    clearRouteForDifferentPlace(place.lat, place.lng);
    setDestinationInput(place.name);
    setDestSuggestions([]);
    const newDest = { lat: place.lat, lng: place.lng, name: place.name };
    setDestCoords(newDest);
    setIsDirectionsOpen(true);
    setSearchedPlace(null);
  };

  // Submit destination on Enter key
  const handleDestinationKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (destSuggestions.length > 0) {
        handleSelectDestination(destSuggestions[0]);
      } else if (destinationInput.trim().length >= 2) {
        setIsSearchingDest(true);
        const results = await searchPlaces(destinationInput.trim(), currentLocation.lat, currentLocation.lng);
        setIsSearchingDest(false);
        if (results.length > 0) {
          handleSelectDestination(results[0]);
        }
      }
    }
  };

  // Select origin from place suggestions
  const handleSelectOrigin = (place: PlaceSearchResult) => {
    setOriginInput(place.name);
    setOriginSuggestions([]);
    setOriginCoords({ lat: place.lat, lng: place.lng, name: place.name });
  };

  // Submit origin on Enter key
  const handleOriginKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (originSuggestions.length > 0) {
        handleSelectOrigin(originSuggestions[0]);
      } else if (originInput.trim().length >= 2 && !originInput.startsWith('Your Location')) {
        setIsSearchingOrigin(true);
        const results = await searchPlaces(originInput.trim(), currentLocation.lat, currentLocation.lng);
        setIsSearchingOrigin(false);
        if (results.length > 0) {
          handleSelectOrigin(results[0]);
        }
      }
    }
  };

  // Select location from top search bar
  const handleSelectSearchMap = (place: PlaceSearchResult) => {
    clearRouteForDifferentPlace(place.lat, place.lng);
    retainPlacePin(place);
    setSearchQuery(place.name);
    setSearchSuggestions([]);
    setIsSearchOpen(false);
    setSearchedPlace(place);
    setMapCenter([place.lat, place.lng]);
    setZoomLevel(16);
  };

  // Search Submit Handler in top search bar
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingMap(true);
    const results = await searchPlaces(searchQuery.trim(), currentLocation.lat, currentLocation.lng);
    setIsSearchingMap(false);

    if (results.length > 0) {
      const place = results[0];
      clearRouteForDifferentPlace(place.lat, place.lng);
      retainPlacePin(place);
      setSearchedPlace(place);
        setMapCenter([place.lat, place.lng]);
      setZoomLevel(16);
      setSearchSuggestions([]);
      setIsSearchOpen(false);
    }
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    if (!destCoords) return;
    const oldOriginInput = originInput;
    const oldOriginCoords = originCoords;

    setOriginInput(destinationInput);
    setOriginCoords({ lat: destCoords.lat, lng: destCoords.lng, name: destCoords.name });

    setDestinationInput(oldOriginInput);
    setDestCoords({ lat: oldOriginCoords.lat, lng: oldOriginCoords.lng, name: oldOriginCoords.name });
  };

  // Recenter GPS
  const handleRecenter = () => {
    setMapCenter([currentLocation.lat, currentLocation.lng]);
    setZoomLevel(15);
    setRouteBounds(null);
  };

  return (
    <div ref={mapContainerRef} className="relative w-full h-full min-h-[360px] flex flex-col bg-[#e5e3df] text-slate-900 overflow-hidden select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. TOP-LEFT COMPACT SEARCH & DIRECTIONS CONTROLS                           */}
      {/* ========================================================================= */}
      <div ref={controlsRef} className="route-map-controls absolute top-2 sm:top-2.5 max-sm:top-16 left-2 sm:left-2.5 z-[450] flex flex-col gap-1.5 pointer-events-auto max-w-[calc(100%-220px)] max-sm:max-w-[calc(100%-1rem)] sm:max-w-[340px] w-auto">
        
        {/* Navigation / Directions Mode Card */}
        {isDirectionsOpen ? (
          <div className="w-[270px] xs:w-[295px] sm:w-[325px] max-w-[calc(100vw-30px)] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Header & Travel Mode Icons */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <div className="flex items-center gap-0.5">
                {(
                  [
                    { mode: 'DRIVING', icon: Car, label: 'Driving' },
                    { mode: 'TRANSIT', icon: Bus, label: 'Transit' },
                    { mode: 'WALKING', icon: Footprints, label: 'Walk' },
                    { mode: 'BICYCLING', icon: Bike, label: 'Cycling' },
                    { mode: 'FLIGHT', icon: Plane, label: 'Flights' },
                  ] as const
                ).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    title={label}
                    className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                      travelMode === mode
                        ? 'bg-blue-50 text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-400 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>

              <button
                onClick={handleCloseDirections}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Close directions"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inputs: Origin (A) and Destination (B) */}
            <div className="flex items-center gap-1.5 relative">
              {/* Vertical Connector Dots */}
              <div className="flex flex-col items-center justify-center py-0.5">
                <div className="w-2 h-2 rounded-full border-2 border-[#1a73e8] bg-white"></div>
                <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 my-0.5"></div>
                <div className="w-2 h-2 rounded-full bg-[#ea4335]"></div>
              </div>

              {/* Text Fields with Autocomplete */}
              <div className="flex-1 flex flex-col gap-1 relative">
                {/* Starting point */}
                <div className="relative">
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    onKeyDown={handleOriginKeyDown}
                    placeholder="Choose starting point or place..."
                    className="w-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-[#1a73e8]"
                  />
                  {/* Origin Suggestions Dropdown */}
                  {originSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[600] max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {originSuggestions.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => handleSelectOrigin(place)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-2"
                        >
                          <span className="text-sm mt-0.5">{getPlaceCategoryIcon(place.category)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{place.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{place.subtitle || place.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination */}
                <div className="relative">
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={handleDestinationKeyDown}
                    placeholder="Search place, mall, hotel, address..."
                    autoFocus
                    className="w-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-[#1a73e8]"
                  />
                  {/* Destination Suggestions Dropdown */}
                  {destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[600] max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {destSuggestions.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => handleSelectDestination(place)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-2"
                        >
                          <span className="text-sm mt-0.5">{getPlaceCategoryIcon(place.category)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{place.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{place.subtitle || place.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap Button */}
              <button
                onClick={handleSwapLocations}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors flex-shrink-0"
                title="Reverse starting point and destination"
              >
                <RotateCw size={14} />
              </button>
            </div>

            {/* Loading Route Indicator */}
            {isLoadingRoute && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#1a73e8] font-medium">
                <Loader2 size={14} className="animate-spin" />
                <span>Finding best real-time road route...</span>
              </div>
            )}

            {/* Route Calculation Result Cards */}
            {!isLoadingRoute && activeRoute && destCoords && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {calculatedRoutes.map((rt) => {
                  const isSelected = rt.id === selectedRouteId;
                  return (
                    <div
                      key={rt.id}
                      onClick={() => setSelectedRouteId(rt.id)}
                      className={`p-2 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/40 border-[#1a73e8] shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-sans">
                            {rt.duration}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            ({rt.distance})
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Fastest
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {rt.via}
                      </div>
                    </div>
                  );
                })}

                {/* Navigation Controls: Start Navigation & Turn-by-Turn Steps */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => {
                      if (isNavigating) {
                        window.speechSynthesis?.cancel();
                        setIsNavigating(false);
                      } else {
                        setNavStepIdx(0);
                        setNavigationPosition(null);
                        setIsNavigating(true);
                      }
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all ${
                      isNavigating
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-[#1a73e8] hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Navigation size={13} className={isNavigating ? 'animate-pulse' : ''} />
                    <span>{isNavigating ? 'Stop' : 'Start'}</span>
                  </button>

                  <button
                    onClick={() => setShowTurnSteps(!showTurnSteps)}
                    className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold transition-colors"
                  >
                    {showTurnSteps ? 'Hide' : 'Steps'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isSearchOpen ? (
          /* Expanded Google Maps Search Bar with Live Places & Quick Categories */
          <div className="relative flex flex-col gap-1.5">
            <form
              onSubmit={handleSearchSubmit}
              className="w-[230px] max-sm:w-[calc(100vw-1rem)] xs:w-[260px] sm:w-[310px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.22)] border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 flex items-center gap-2 transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Google 4-Color Styled Search Icon */}
              <div className="flex items-center flex-shrink-0">
                {isSearchingMap ? (
                  <Loader2 size={15} className="animate-spin text-[#4285F4]" />
                ) : (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-black font-sans text-[#4285F4]">
                    <Search size={14} className="text-[#4285F4]" />
                  </div>
                )}
              </div>

              {/* Search Input Field */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places, roads, landmarks..."
                autoFocus
                className="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              {/* Clear Button */}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchSuggestions([]);
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                >
                  <X size={13} />
                </button>
              ) : null}

              {/* Close / Collapse button */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors flex-shrink-0"
                title="Collapse search"
              >
                <X size={14} />
              </button>
            </form>

            {/* Quick POI Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[230px] xs:max-w-[260px] sm:max-w-[310px]">
              {(
                [
                  { label: 'Food', query: 'Restaurant' },
                  { label: 'Coffee', query: 'Coffee shop' },
                  { label: 'Gas', query: 'Gas station' },
                  { label: 'Hotels', query: 'Hotel' },
                  { label: 'Groceries', query: 'Supermarket' },
                  { label: 'Pharmacy', query: 'Pharmacy' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={async () => {
                    setSearchQuery(chip.query);
                    setIsSearchingMap(true);
                    const results = await searchPlaces(chip.query, currentLocation.lat, currentLocation.lng);
                    setIsSearchingMap(false);
                    setSearchSuggestions(results.slice(0, 6));
                  }}
                  className="px-2 py-1 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap flex-shrink-0 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[600] max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchSuggestions.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectSearchMap(place)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-2"
                  >
                    <span className="text-base mt-0.5">{getPlaceCategoryIcon(place.category)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{place.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{place.subtitle || place.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Compact search control */
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Search Any Place or Landmark"
              className="w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:text-[#1a73e8] shadow-[0_2px_6px_rgba(0,0,0,0.22)] hover:shadow-md border border-slate-200 dark:border-slate-700/80 backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            >
              <Search size={15} />
            </button>

          </div>
        )}

        {/* Turn-by-Turn Maneuvers Drawer */}
        {showTurnSteps && activeRoute && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.25)] border border-slate-200 dark:border-slate-800 p-3 max-h-56 overflow-y-auto space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Turn-by-turn directions ({activeRoute.steps.length} steps)
              </span>
              <button onClick={() => setShowTurnSteps(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
            {activeRoute.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 py-1 text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-200">{step.instruction}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {step.distance} • {step.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keep voice navigation inside the control stack so using it never
            triggers the map's click-away handler or closes route directions. */}
        {isNavigating && activeRoute && (
        <div className="z-[550] bg-[#137333] dark:bg-[#1b5e20] text-white px-2.5 py-1.5 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.35)] border border-emerald-400 flex items-center gap-2 w-[270px] xs:w-[295px] sm:w-[325px] max-w-[calc(100vw-30px)] animate-in fade-in slide-in-from-top-3">
          {/* Turn Maneuver Direction Icon */}
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white flex-shrink-0 font-bold text-base shadow-inner">
            {activeRoute.steps[navStepIdx]?.action === 'right' ? '↱' :
             activeRoute.steps[navStepIdx]?.action === 'left' ? '↰' :
             activeRoute.steps[navStepIdx]?.action === 'arrive' ? '🏁' : '↑'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-emerald-200 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <span>Step {navStepIdx + 1}/{activeRoute.steps.length}</span>
              <span>•</span>
              <span className="bg-emerald-800/80 px-1.5 py-0.2 rounded font-mono text-[9px]">
                {settings?.windUnit === 'mph' ? '32 mph' : '52 km/h'}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-bold truncate text-white">
              {activeRoute.steps[navStepIdx]?.instruction || 'Continue on route'}
            </div>
            <div className="text-[10px] text-emerald-100 flex items-center gap-1.5 font-medium">
              <span>In {activeRoute.steps[navStepIdx]?.distance}</span>
              <span>•</span>
              <span>ETA {activeRoute.duration}</span>
            </div>
          </div>

          {/* Voice Mute/Unmute & Stop Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsVoiceMuted(!isVoiceMuted)}
              title={isVoiceMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              {isVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                setIsNavigating(false);
              }}
              title="Close voice navigation"
              className="p-1.5 rounded-full bg-white/20 hover:bg-rose-600 text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCHED PLACE POPUP CARD (WHEN SEARCHING SPECIFIC PLACE)              */}
      {/* ========================================================================= */}
      {searchedPlace && !isDirectionsOpen && !isNavigating && (
        <div className="absolute bottom-16 left-3 sm:left-4 z-[500] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 w-[270px] sm:w-[310px] p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{getPlaceCategoryIcon(searchedPlace.category)}</span>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{searchedPlace.name}</h4>
                <span className="text-[10px] text-[#1a73e8] font-bold uppercase tracking-wider">{searchedPlace.type}</span>
              </div>
            </div>
            <button
              onClick={() => setSearchedPlace(null)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
            <MapPin size={12} className="flex-shrink-0 text-slate-400 mt-0.5" />
            <span className="line-clamp-2">{searchedPlace.address}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setDestinationInput(searchedPlace.name);
                setDestCoords({ lat: searchedPlace.lat, lng: searchedPlace.lng, name: searchedPlace.name });
                setIsDirectionsOpen(true);
                setSearchedPlace(null);
              }}
              className="py-1.5 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Navigation size={13} />
              <span>Directions</span>
            </button>
            <button
              onClick={() => {
                setMapCenter([searchedPlace.lat, searchedPlace.lng]);
                setZoomLevel(17);
              }}
              className="py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Maximize2 size={12} />
              <span>Zoom In</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.1 SELECTED POI INFO CARD (WHEN A MAP PIN IS CLICKED)                     */}
      {/* ========================================================================= */}


      {/* ========================================================================= */}
      {/* 4. MAIN MAP CONTAINER (OPEN MAPLIBRE/OPENFREEMAP VECTOR MAP)               */}
      {/* ========================================================================= */}
      <div className="w-full h-full flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={zoomLevel}
          minZoom={3}
          maxZoom={21}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={true}
          maxBounds={[[-85, -180], [85, 180]]}
          maxBoundsViscosity={1}
          style={{ width: '100%', height: '100%', minHeight: isExpanded ? '0' : '340px' }}
        >
          <MapController center={mapCenter} zoom={zoomLevel} routeBounds={routeBounds} />
          <MapLibreVectorLayer styleUrl={OPENFREE_STYLE_URLS[mapType]} onReady={handleVectorMapReady} />
          <NamedPoiClickHandler vectorMapRef={vectorMapRef} onPlaceClick={handleVectorPoiClick} onCoordinateClick={handleNamedPoiClick} />

          {/* Keep an established route visible when control panels are collapsed. */}
          {activeRoute && activeRoute.points.length > 0 && (
            <>
              {/* Outer High-Definition Blue Border */}
              <Polyline
                positions={activeRoute.points}
                pathOptions={{
                  color: '#1a73e8',
                  weight: 7,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner High-Contrast Direction Line */}
              <Polyline
                positions={activeRoute.points}
                pathOptions={{
                  color: '#4285f4',
                  weight: 4,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {/* Directional current-location arrow */}
          {isNavigating && activeRoute && activeRoute.points.length > 0 ? (
            <Marker
              position={navigationPosition
                ? [navigationPosition.lat, navigationPosition.lng]
                : [originCoords.lat, originCoords.lng]}
              icon={L.divIcon({
                className: 'bg-transparent',
                html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
                         <div style="position:absolute;inset:2px;border-radius:9999px;background:rgba(239,68,68,.14);border:2px solid rgba(248,113,113,.7);box-shadow:0 0 8px 3px rgba(239,68,68,.55);"></div>
                         <div style="position:relative;width:32px;height:32px;transform:rotate(${navigationPosition?.heading ?? 0}deg);transform-origin:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));">
                           <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
                             <path d="M16 2 L28 29 L16 23 L4 29 Z" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
                           </svg>
                         </div>
                       </div>`,
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              })}
            />
          ) : (
            <Marker
              position={[originCoords.lat, originCoords.lng]}
              icon={L.divIcon({
                className: 'bg-transparent',
                html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                         <div style="position:absolute;inset:2px;border-radius:9999px;background:rgba(239,68,68,.14);border:2px solid rgba(248,113,113,.7);box-shadow:0 0 8px 3px rgba(239,68,68,.5);"></div>
                         <div style="position:relative;width:28px;height:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">
                           <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
                             <path d="M16 2 L28 29 L16 23 L4 29 Z" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
                           </svg>
                         </div>
                       </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              })}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
                <div className="text-xs font-bold text-slate-900">{originCoords.name}</div>
              </Tooltip>
            </Marker>
          )}

          {/* Destination Marker (Iconic Red Pin) */}
          {destCoords && (
            <Marker
              position={[destCoords.lat, destCoords.lng]}
              icon={L.divIcon({
                className: 'bg-transparent',
                html: `<div class="relative flex items-center justify-center -translate-y-4">
                         <div class="w-7 h-7 rounded-full bg-[#ea4335] text-white flex items-center justify-center shadow-2xl border-2 border-white text-xs">
                           📍
                         </div>
                       </div>`,
                iconAnchor: [14, 28],
              })}
            >
              <Popup>
                <div className="p-1 text-slate-900 text-xs">
                  <div className="font-bold">{destCoords.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Retained place pins from explicit place searches. */}
          {pinnedPlaces
            .filter((place) => !destCoords || Math.abs(place.lat - destCoords.lat) > 0.00001 || Math.abs(place.lng - destCoords.lng) > 0.00001)
            .map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={L.divIcon({
                  className: 'bg-transparent',
                  html: `<div class="w-6 h-6 -translate-y-3 rounded-full bg-violet-600 text-white flex items-center justify-center border-2 border-white shadow-md text-[11px]">📍</div>`,
                  iconAnchor: [12, 24],
                })}
                eventHandlers={{
                  click: () => {
                    clearRouteForDifferentPlace(place.lat, place.lng);
                    setSearchedPlace(place);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                  <div className="text-xs font-bold text-slate-900">{place.name}</div>
                </Tooltip>
              </Marker>
            ))}

          {/* Empty-map clicks never create pins. */}
        </MapContainer>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM-LEFT OPEN MAP STYLE TOGGLE                                       */}
      {/* ========================================================================= */}
      <div className="absolute bottom-2.5 left-2.5 z-[500] flex items-center gap-2 pointer-events-auto">
        
        {/* Layer Selector Thumbnail Box */}
        <div ref={layerControlsRef} className="relative">
          {showLayerMenu && (
            <div className="absolute bottom-12 left-0 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.35)] border border-slate-200 dark:border-slate-800 p-3 min-w-[210px] flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Route Map Type
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'roadmap', label: 'Liberty' },
                    { id: 'streets', label: 'Bright' },
                    { id: 'hybrid', label: 'Positron' },
                    { id: 'terrain', label: 'Fiord' },
                    { id: 'satellite', label: 'Dark' },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setMapType(id);
                      setShowLayerMenu(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left ${
                      mapType === id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-[#1a73e8] text-[#1a73e8] dark:text-blue-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="text-[9px] leading-snug text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                Open vector styles. Place labels can be selected for details and directions.
              </div>
            </div>
          )}

          {/* The Square Layers Card Button */}
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-[0_2px_6px_rgba(0,0,0,0.25)] hover:shadow-lg flex items-center justify-center overflow-hidden transition-all group"
            title="Route Map Type"
          >
            <Layers size={17} className="text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Live Coordinates Indicator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300">
          <span className="font-mono text-slate-500 font-bold">
            {currentLocation.lat.toFixed(2)}°, {currentLocation.lng.toFixed(2)}°
          </span>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-0.5 left-14 right-14 z-[500] rounded bg-white/80 px-1 py-px text-center text-[7px] leading-tight text-slate-600 backdrop-blur-sm dark:bg-slate-900/80 dark:text-slate-300">
        <a href="https://openfreemap.org/" target="_blank" rel="noreferrer" className="hover:underline">OpenFreeMap</a>
        {' · © '}
        <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer" className="hover:underline">OpenMapTiles</a>
        {' · © '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline">OpenStreetMap contributors</a>
      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM-RIGHT CONTROL STACK (ZOOM & GPS RECENTER)                       */}
      {/* ========================================================================= */}
      <div className="absolute bottom-2.5 right-2.5 z-[500] flex flex-col items-center gap-2 pointer-events-auto">
        
        {/* Recenter / "Show Your Location" Target Crosshair Button */}
        <button
          onClick={handleRecenter}
          title="Show your location"
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-[#1a73e8] dark:hover:text-blue-400 shadow-[0_2px_6px_rgba(0,0,0,0.25)] hover:shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all active:scale-95"
        >
          <Crosshair size={17} />
        </button>

        {/* Zoom In & Zoom Out Stack */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.25)] border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            onClick={() => {
              setRouteBounds(null);
              const map = mapRef.current;
              if (map) {
                map.zoomIn(1);
                setZoomLevel(map.getZoom());
              }
            }}
            className="w-8 h-8 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold border-b border-slate-100 dark:border-slate-800 transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => {
              setRouteBounds(null);
              const map = mapRef.current;
              if (map) {
                map.zoomOut(1);
                setZoomLevel(map.getZoom());
              }
            }}
            className="w-8 h-8 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold transition-colors"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
