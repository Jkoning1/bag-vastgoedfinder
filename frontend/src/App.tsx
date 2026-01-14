import { useState, useEffect } from 'react';
import MapView from './components/MapView';
import FilterPanel from './components/FilterPanel';
import ResultsTable from './components/ResultsTable';
import { api } from './api/client';
import { Verblijfsobject, FilterState } from './types';
import './App.css';

function App() {
  const [verblijfsobjecten, setVerblijfsobjecten] = useState<Verblijfsobject[]>([]);
  const [gemeenten, setGemeenten] = useState<string[]>(['Rotterdam']);
  const [filters, setFilters] = useState<FilterState>({
    gemeente: 'Rotterdam',
    minOppervlakte: 1000
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load gemeenten on mount
  useEffect(() => {
    loadGemeenten();
  }, []);

  // Load initial data
  useEffect(() => {
    loadVerblijfsobjecten();
  }, []);

  const loadGemeenten = async () => {
    try {
      const data = await api.getGemeenten();
      if (data.length > 0) {
        setGemeenten(data);
      }
    } catch (err) {
      console.error('Failed to load gemeenten:', err);
      // Keep default gemeente
    }
  };

  const loadVerblijfsobjecten = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVerblijfsobjecten(filters.gemeente, filters.minOppervlakte);
      setVerblijfsobjecten(data.results);
      setSelectedId(null); // Reset selection
    } catch (err) {
      console.error('Failed to load verblijfsobjecten:', err);
      setError('Fout bij het laden van data. Controleer de backend verbinding.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    loadVerblijfsobjecten();
  };

  const handleFeatureClick = (id: string) => {
    setSelectedId(id);
  };

  const handleRowClick = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏘️ BAG Vastgoedfinder</h1>
        <p>Zoek grote woningen in Nederlandse gemeenten</p>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <FilterPanel
            filters={filters}
            gemeenten={gemeenten}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            loading={loading}
          />
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <ResultsTable
            verblijfsobjecten={verblijfsobjecten}
            selectedId={selectedId}
            onRowClick={handleRowClick}
          />
        </aside>

        <main className="main-content">
          <MapView
            verblijfsobjecten={verblijfsobjecten}
            selectedId={selectedId}
            onFeatureClick={handleFeatureClick}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
