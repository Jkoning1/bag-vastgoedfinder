// GeoJSON types
export interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

// Verblijfsobject response type
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

// Query parameters
export interface QueryParams {
  gemeente?: string;
  minOppervlakte?: string;
}
