import React from 'react';
import { FilterState } from '../types';

interface FilterPanelProps {
  filters: FilterState;
  gemeenten: string[];
  onFilterChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
  loading: boolean;
}

const FilterPanel = ({
  filters,
  gemeenten,
  onFilterChange,
  onApplyFilters,
  loading
}: FilterPanelProps) => {
  const handleGemeenteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, gemeente: e.target.value });
  };

  const handleOppervlakteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      onFilterChange({ ...filters, minOppervlakte: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters();
  };

  return (
    <div className="filter-panel">
      <h2>Filters</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="gemeente">Gemeente:</label>
          <select
            id="gemeente"
            value={filters.gemeente}
            onChange={handleGemeenteChange}
            disabled={loading}
          >
            {gemeenten.map((gem: string) => (
              <option key={gem} value={gem}>{gem}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="minOppervlakte">
            Min. oppervlakte (m²):
          </label>
          <input
            id="minOppervlakte"
            type="number"
            min="0"
            step="100"
            value={filters.minOppervlakte}
            onChange={handleOppervlakteChange}
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Laden...' : 'Zoeken'}
        </button>
      </form>
    </div>
  );
};

export default FilterPanel;
