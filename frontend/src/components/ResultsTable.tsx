import { Verblijfsobject } from '../types';

interface ResultsTableProps {
  verblijfsobjecten: Verblijfsobject[];
  selectedId: string | null;
  onRowClick: (id: string) => void;
}

const ResultsTable = ({
  verblijfsobjecten,
  selectedId,
  onRowClick
}: ResultsTableProps) => {
  if (verblijfsobjecten.length === 0) {
    return (
      <div className="results-table">
        <h2>Resultaten</h2>
        <p className="no-results">Geen resultaten gevonden. Pas de filters aan en probeer opnieuw.</p>
      </div>
    );
  }

  return (
    <div className="results-table">
      <h2>Resultaten ({verblijfsobjecten.length})</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Oppervlakte (m²)</th>
              <th>Gemeente</th>
            </tr>
          </thead>
          <tbody>
            {verblijfsobjecten.map(obj => (
              <tr
                key={obj.id}
                className={selectedId === obj.id ? 'selected' : ''}
                onClick={() => onRowClick(obj.id)}
              >
                <td>{obj.id}</td>
                <td>{obj.oppervlakte.toLocaleString('nl-NL')}</td>
                <td>{obj.gemeente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
