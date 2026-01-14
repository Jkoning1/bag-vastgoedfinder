# 🚀 GitHub en Railway Deployment Guide

## Stap 1: GitHub Repository Aanmaken

### Via GitHub Website:
1. Ga naar https://github.com/new
2. Repository naam: `bag-vastgoedfinder` (of naar keuze)
3. Beschrijving: "BAG Vastgoedfinder - Find large residential properties in Dutch municipalities"
4. **Belangrijk**: Kies **Private** of **Public** (jouw keuze)
5. **NIET** aanvinken:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
6. Klik "Create repository"

### Stap 2: Push naar GitHub

Kopieer de remote URL die GitHub je geeft en voer uit:

```bash
cd "/Users/juliandekoning/Desktop/Project - Real Estate finder /vastgoedfinder"

# Voeg GitHub remote toe (vervang <USERNAME> met je GitHub username)
git remote add origin https://github.com/<USERNAME>/bag-vastgoedfinder.git

# Of met SSH:
# git remote add origin git@github.com:<USERNAME>/bag-vastgoedfinder.git

# Push naar GitHub
git branch -M main
git push -u origin main
```

## Stap 3: Railway Deployment

### A. Railway Account & Setup
1. Ga naar https://railway.app
2. Log in met GitHub
3. Klik op "New Project"

### B. PostgreSQL Database Toevoegen
1. In je nieuwe project: "New" → "Database" → "PostgreSQL"
2. Wacht tot database is gedeployed
3. Klik op PostgreSQL service
4. Ga naar "Connect" tab
5. Kopieer de `DATABASE_URL` (voor later)

### C. PostGIS Extensie Installeren
1. In PostgreSQL service, ga naar "Data" tab
2. Open Query console
3. Voer uit:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_version();
```

### D. BAG Data Importeren
Je moet nu je BAG data importeren. Opties:

**Optie 1: Via pg_restore**
```bash
# Als je een backup hebt
pg_restore -d <RAILWAY_DATABASE_URL> your_bag_backup.dump
```

**Optie 2: Via psql**
```bash
# Connect naar Railway database
psql <RAILWAY_DATABASE_URL>

# Importeer je data
\i /path/to/your/bag_data.sql
```

### E. Backend Service Deployen
1. In Railway project: "New" → "GitHub Repo"
2. Selecteer `bag-vastgoedfinder` repository
3. Railway detecteert automatisch Node.js/Express
4. Configureer build:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Ga naar "Variables" tab en voeg toe:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = klik "Reference" en selecteer PostgreSQL database URL
   - `PORT` = wordt automatisch gezet door Railway

6. Deploy!

### F. Verificatie
1. Railway geeft je een URL: `https://your-app.up.railway.app`
2. Test endpoints:
   - `https://your-app.up.railway.app/api/health`
   - `https://your-app.up.railway.app/api/gemeenten`
   - `https://your-app.up.railway.app/api/verblijfsobjecten?gemeente=Rotterdam&minOppervlakte=1000`

## Stap 4: Frontend Deployment (Kies één optie)

### Optie A: Integreer Frontend in Backend (Simpelste voor Railway)

Maak wijzigingen in backend om frontend te serveren:

1. Build frontend lokaal:
```bash
cd frontend
npm run build
```

2. Kopieer dist naar backend:
```bash
mkdir -p ../backend/public
cp -r dist/* ../backend/public/
```

3. Update `backend/src/index.ts`:
```typescript
import path from 'path';

// Serve static files (add BEFORE API routes)
app.use(express.static(path.join(__dirname, '../public')));

// ... your API routes ...

// Serve frontend for all other routes (add AFTER API routes)
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

4. Update `backend/package.json`:
```json
{
  "scripts": {
    "build": "cd ../frontend && npm install && npm run build && mkdir -p ../backend/public && cp -r dist/* ../backend/public/ && cd ../backend && tsc",
    "start": "node dist/index.js"
  }
}
```

5. Commit en push:
```bash
git add .
git commit -m "Integrate frontend into backend"
git push
```

Railway zal automatisch opnieuw deployen!

### Optie B: Deploy Frontend Apart op Vercel

1. Ga naar https://vercel.com
2. Import GitHub repository
3. Project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL` = `https://your-railway-backend.up.railway.app/api`
4. Deploy!

## ✅ Deployment Checklist

- [ ] GitHub repository aangemaakt
- [ ] Code gepusht naar GitHub
- [ ] Railway account aangemaakt
- [ ] PostgreSQL database toegevoegd op Railway
- [ ] PostGIS extensie geïnstalleerd
- [ ] BAG data geïmporteerd
- [ ] Backend service gedeployed
- [ ] Environment variables geconfigureerd
- [ ] API endpoints getest
- [ ] Frontend gedeployed (optie A of B)
- [ ] Frontend kan backend bereiken
- [ ] App volledig werkend in productie

## 🆘 Troubleshooting

### Backend deployment faalt
- Check Railway logs in "Deployments" tab
- Verifieer `package.json` scripts
- Check environment variables

### Database connection errors
- Verifieer DATABASE_URL is correct gekoppeld
- Check of PostGIS extensie is geïnstalleerd
- Test database connectie lokaal eerst

### Frontend kan backend niet bereiken
- Check CORS instellingen in backend
- Verifieer API URL in frontend environment variables
- Check Railway deployment logs

### BAG data niet beschikbaar
- Run verification queries in Railway PostgreSQL console
- Check of tabellen en data correct zijn geïmporteerd
- Verifieer column names matchen met API queries

## 📊 Geschatte Kosten

Railway free tier:
- $5 gratis credit per maand
- Daarna ~$5-10/maand voor hobby project

## 🎉 Klaar!

Je app is nu live op Railway! 🚀
