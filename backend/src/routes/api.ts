import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { Verblijfsobject, VerblijfsobjectResponse, QueryParams } from '../types';

const router = Router();

/**
 * GET /api/verblijfsobjecten
 * 
 * Query parameters:
 * - gemeente: string (default: "Rotterdam")
 * - minOppervlakte: number (default: 1000)
 * 
 * Returns verblijfsobjecten with woonfunctie filtered by gemeente and minimum oppervlakte
 */
router.get('/verblijfsobjecten', async (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  try {
    const gemeente = req.query.gemeente || 'Rotterdam';
    const minOppervlakte = parseInt(req.query.minOppervlakte || '1000', 10);

    // Validate minOppervlakte
    if (isNaN(minOppervlakte) || minOppervlakte < 0) {
      return res.status(400).json({ 
        error: 'Invalid minOppervlakte parameter. Must be a positive number.' 
      });
    }

    // SQL query - using lat/lon columns (no PostGIS needed)
    // Using parameterized queries to prevent SQL injection
    const query = `
      SELECT 
        v.id,
        v.oppervlakte,
        v.gemeente,
        v.lat,
        v.lon
      FROM verblijfsobject v
      WHERE v.gebruiksdoel = 'woonfunctie'
        AND v.gemeente = $1
        AND v.oppervlakte >= $2
      ORDER BY v.oppervlakte DESC
      LIMIT 1000;
    `;

    const result = await pool.query(query, [gemeente, minOppervlakte]);

    const verblijfsobjecten: Verblijfsobject[] = result.rows.map((row: any) => ({
      id: row.id,
      oppervlakte: row.oppervlakte,
      gemeente: row.gemeente,
      geometry: {
        type: 'Point',
        coordinates: [row.lon, row.lat]
      }
    }));

    const response: VerblijfsobjectResponse = {
      count: verblijfsobjecten.length,
      results: verblijfsobjecten
    };

    res.json(response);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch verblijfsobjecten',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/gemeenten
 * 
 * Returns list of unique gemeenten available in the database
 */
router.get('/gemeenten', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT gemeente
      FROM verblijfsobject
      WHERE gebruiksdoel = 'woonfunctie'
        AND gemeente IS NOT NULL
      ORDER BY gemeente ASC;
    `;

    const result = await pool.query(query);
    const gemeenten = result.rows.map((row: any) => row.gemeente);

    res.json({ gemeenten });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gemeenten',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health
 * 
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
