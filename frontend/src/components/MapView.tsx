import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Verblijfsobject } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
// Using CDN URLs instead of local imports to avoid build issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  verblijfsobjecten: Verblijfsobject[];
  selectedId: string | null;
  onFeatureClick: (id: string) => void;
}

// Component to fit bounds when data changes
const FitBounds = ({ verblijfsobjecten }: { verblijfsobjecten: Verblijfsobject[] }) => {
  const map = useMap();

  useEffect(() => {
    if (verblijfsobjecten.length > 0) {
      const geoJsonLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: verblijfsobjecten.map(obj => ({
          type: 'Feature' as const,
          geometry: obj.geometry as any,
          properties: { id: obj.id }
        }))
      } as any);
      
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [verblijfsobjecten, map]);

  return null;
};

const MapView = ({ verblijfsobjecten, selectedId, onFeatureClick }: MapViewProps) => {
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Rotterdam default center
  const defaultCenter: [number, number] = [51.9225, 4.47917];
  const defaultZoom = 12;

  // Create GeoJSON FeatureCollection
  const geoJsonData = {
    type: 'FeatureCollection' as const,
    features: verblijfsobjecten.map(obj => ({
      type: 'Feature' as const,
      geometry: obj.geometry as any,
      properties: {
        id: obj.id,
        oppervlakte: obj.oppervlakte,
        gemeente: obj.gemeente
      }
    }))
  };

  // Style function
  const style = (feature?: GeoJSON.Feature) => {
    const isSelected = feature?.properties?.id === selectedId;
    return {
      fillColor: isSelected ? '#ff7800' : '#3388ff',
      weight: isSelected ? 3 : 2,
      opacity: 1,
      color: isSelected ? '#ff7800' : '#3388ff',
      fillOpacity: isSelected ? 0.7 : 0.5
    };
  };

  // On each feature
  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (feature.properties) {
      const { id, oppervlakte, gemeente } = feature.properties;
      
      // Popup
      layer.bindPopup(`
        <div>
          <strong>ID:</strong> ${id}<br/>
          <strong>Oppervlakte:</strong> ${oppervlakte} m²<br/>
          <strong>Gemeente:</strong> ${gemeente}
        </div>
      `);

      // Click handler
      layer.on('click', () => {
        onFeatureClick(id);
      });
    }
  };

  return (
    <div className="map-container">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {verblijfsobjecten.length > 0 && (
          <>
            <GeoJSON
              ref={geoJsonRef}
              data={geoJsonData}
              style={style}
              onEachFeature={onEachFeature}
            />
            <FitBounds verblijfsobjecten={verblijfsobjecten} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
