-- Example SQL query to verify BAG data structure
-- Run this to check if your database is properly set up

-- Check if PostGIS extension is installed
SELECT PostGIS_version();

-- Count verblijfsobjecten with woonfunctie
SELECT COUNT(*) as total_woningen
FROM verblijfsobject
WHERE gebruiksdoel = 'woonfunctie';

-- Count by gemeente
SELECT gemeente, COUNT(*) as aantal
FROM verblijfsobject
WHERE gebruiksdoel = 'woonfunctie'
GROUP BY gemeente
ORDER BY aantal DESC
LIMIT 10;

-- Find large residential properties in Rotterdam (example query matching the API)
SELECT 
  v.id,
  v.oppervlakte,
  v.gemeente,
  ST_AsGeoJSON(v.geometrie)::json as geometry
FROM verblijfsobject v
WHERE v.gebruiksdoel = 'woonfunctie'
  AND v.gemeente = 'Rotterdam'
  AND v.oppervlakte >= 1000
ORDER BY v.oppervlakte DESC
LIMIT 100;

-- Check geometry types
SELECT 
  ST_GeometryType(geometrie) as geom_type,
  COUNT(*) as count
FROM verblijfsobject
WHERE gebruiksdoel = 'woonfunctie'
GROUP BY ST_GeometryType(geometrie);

-- Verify spatial index exists (recommended for performance)
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'verblijfsobject'
  AND indexdef LIKE '%USING gist%';

-- If spatial index doesn't exist, create it:
-- CREATE INDEX idx_verblijfsobject_geom ON verblijfsobject USING GIST (geometrie);
