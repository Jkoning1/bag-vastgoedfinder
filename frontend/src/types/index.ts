// GeoJSON types
export interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

// Verblijfsobject data type
export interface Verblijfsobject {
  id: string;
  oppervlakte: number;
  gemeente: string;
  geometry: GeoJSONGeometry;
}

// API response type
export interface VerblijfsobjectResponse {
  count: number;
  results: Verblijfsobject[];
}

// Filter state
export interface FilterState {
  gemeente: string;
  minOppervlakte: number;
}

// Gemeenten list response
export interface GemeentenResponse {
  gemeenten: string[];
}
