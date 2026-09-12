export type CycloneAgency = 'NHC' | 'JMA';
export type LatLon = [number, number];
export interface ForecastFix {
  position: LatLon;
  validAt: string;
  leadHours: number;
  probabilityRadiusM?: number;
}
export interface LiveCyclone {
  id: string;
  name: string;
  agency: CycloneAgency;
  category: string;
  issuedAt: string;
  observedAt: string;
  position: LatLon;
  history: LatLon[];
  forecast: ForecastFix[];
  sourceUrl: string;
  warning?: string;
}
export interface CycloneFeed {
  fetchedAt: string;
  storms: LiveCyclone[];
  sources: { agency: CycloneAgency | 'JTWC'; state: 'ok' | 'partial' | 'unavailable'; message?: string }[];
  stale?: boolean;
}
