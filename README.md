# BAG Vastgoedfinder 🏘️

A production-ready web application for finding large residential properties based on Dutch BAG (Basisregistratie Adressen en Gebouwen) cadastral data.

## Features

- 🗺️ Interactive map visualization using Leaflet
- 🔍 Filter properties by municipality and surface area
- 📊 Sortable data table with property details
- 🎯 Click to highlight features on map and table
- 🚀 Optimized for Railway deployment
- 📦 PostgreSQL/PostGIS spatial database

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast development
- **Leaflet** for interactive maps
- **Axios** for API requests
- Minimal, responsive CSS

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with PostGIS extension
- Parameterized SQL queries
- CORS enabled

## Project Structure

```
vastgoedfinder/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express server entry point
│   │   ├── routes/
│   │   │   └── api.ts         # API routes
│   │   ├── db/
│   │   │   └── pool.ts        # PostgreSQL connection pool
│   │   └── types/
│   │       └── index.ts       # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── ResultsTable.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/
│   └── example-queries.sql
├── railway.json
└── README.md
```

## Database Schema

The application expects the following tables in PostgreSQL:

### verblijfsobject table
```sql
CREATE TABLE verblijfsobject (
  id VARCHAR PRIMARY KEY,
  gebruiksdoel VARCHAR,
  oppervlakte NUMERIC,
  geometrie GEOMETRY(Point, 28992),  -- or appropriate geometry type
  pand_id VARCHAR,
  gemeente VARCHAR
);

-- Required index for performance
CREATE INDEX idx_verblijfsobject_geom ON verblijfsobject USING GIST (geometrie);
CREATE INDEX idx_verblijfsobject_gemeente ON verblijfsobject (gemeente);
CREATE INDEX idx_verblijfsobject_gebruiksdoel ON verblijfsobject (gebruiksdoel);
```

## Local Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- BAG data imported into PostgreSQL

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` with your database credentials:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/bag_database
PORT=3000
NODE_ENV=development
```

5. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional for local development):
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## API Endpoints

### GET /api/verblijfsobjecten

Query parameters:
- `gemeente` (string, default: "Rotterdam") - Municipality name
- `minOppervlakte` (number, default: 1000) - Minimum surface area in m²

Returns verblijfsobjecten with `gebruiksdoel = 'woonfunctie'` filtered by parameters.

**Example:**
```bash
curl "http://localhost:3000/api/verblijfsobjecten?gemeente=Rotterdam&minOppervlakte=1000"
```

**Response:**
```json
{
  "count": 42,
  "results": [
    {
      "id": "0363010000000001",
      "oppervlakte": 1500,
      "gemeente": "Rotterdam",
      "geometry": {
        "type": "Point",
        "coordinates": [4.47917, 51.9225]
      }
    }
  ]
}
```

### GET /api/gemeenten

Returns list of available municipalities.

### GET /api/health

Health check endpoint for monitoring.

## Railway Deployment

### Step 1: Prepare Your Repository

1. Initialize git repository (if not already):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Push to GitHub/GitLab:
```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Set Up PostgreSQL on Railway

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Add **PostgreSQL** service
4. Add **PostGIS** extension:
   - Connect to your Railway PostgreSQL database
   - Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

### Step 3: Import BAG Data

Import your BAG data into the Railway PostgreSQL database using pg_dump/restore or your preferred method.

### Step 4: Deploy Backend

1. In Railway, add a **New Service** from your GitHub repo
2. Set the **Root Directory** to `backend`
3. Add environment variables:
   - `DATABASE_URL` - Copy from your PostgreSQL service (use internal URL)
   - `PORT` - Railway will set this automatically
   - `NODE_ENV` - Set to `production`

4. Railway will automatically:
   - Detect Node.js
   - Run `npm install`
   - Run `npm run build`
   - Run `npm start`

### Step 5: Deploy Frontend (Optional - Static Hosting)

For production, you have two options:

**Option A: Serve from Backend**

Modify backend to serve frontend static files:

```typescript
// In backend/src/index.ts
import path from 'path';

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

Update build process to build both:
```json
// In backend/package.json
{
  "scripts": {
    "build": "cd ../frontend && npm install && npm run build && cd ../backend && tsc"
  }
}
```

**Option B: Deploy Frontend Separately**

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Deploy `dist/` folder to:
   - Vercel
   - Netlify
   - Cloudflare Pages
   - Railway static site

3. Set environment variable:
```env
VITE_API_URL=https://your-backend.railway.app/api
```

### Environment Variables Summary

**Backend (Railway):**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Automatically set by Railway
- `NODE_ENV=production`

**Frontend (if separate deployment):**
- `VITE_API_URL` - Backend API URL

## Production Checklist

- [ ] PostGIS extension installed
- [ ] BAG data imported
- [ ] Spatial indexes created (see `database/example-queries.sql`)
- [ ] Backend environment variables configured
- [ ] Frontend API URL configured
- [ ] CORS settings verified
- [ ] Database connection pooling configured
- [ ] Error monitoring set up (optional)
- [ ] SSL/HTTPS enabled

## Performance Optimization

### Database

1. Create indexes:
```sql
CREATE INDEX idx_verblijfsobject_geom ON verblijfsobject USING GIST (geometrie);
CREATE INDEX idx_verblijfsobject_filters ON verblijfsobject (gemeente, gebruiksdoel, oppervlakte);
```

2. Analyze query performance:
```sql
EXPLAIN ANALYZE
SELECT id, oppervlakte, gemeente, ST_AsGeoJSON(geometrie)::json
FROM verblijfsobject
WHERE gebruiksdoel = 'woonfunctie'
  AND gemeente = 'Rotterdam'
  AND oppervlakte >= 1000;
```

### Application

- Connection pooling configured (20 max connections)
- Results limited to 1000 items
- GeoJSON conversion in database (faster than application layer)
- Parameterized queries prevent SQL injection

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check PostGIS
SELECT PostGIS_version();
```

### Frontend Can't Reach Backend

1. Check CORS settings in backend
2. Verify `VITE_API_URL` environment variable
3. Check Railway service logs

### No Results Returned

1. Verify data exists:
```sql
SELECT COUNT(*) FROM verblijfsobject WHERE gebruiksdoel = 'woonfunctie';
```

2. Check filter values match your data
3. Verify geometry column name matches

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

Built with ❤️ for Dutch real estate professionals
