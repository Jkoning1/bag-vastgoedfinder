# Installatie Instructies

## Stap 1: Backend Dependencies Installeren

```bash
cd backend
npm install
```

Dit installeert:
- express
- pg (PostgreSQL client)
- cors
- dotenv
- TypeScript en alle @types packages

## Stap 2: Frontend Dependencies Installeren

```bash
cd ../frontend
npm install
```

Dit installeert:
- React & React DOM
- Leaflet & React-Leaflet
- Axios
- Vite
- TypeScript en alle @types packages

## Stap 3: Database Configureren

1. Kopieer `.env.example` naar `.env` in de backend folder:
```bash
cd ../backend
cp .env.example .env
```

2. Bewerk `.env` en vul je database credentials in:
```env
DATABASE_URL=postgresql://gebruiker:wachtwoord@localhost:5432/bag_database
PORT=3000
NODE_ENV=development
```

## Stap 4: Verifieer Database

Zorg dat je PostgreSQL database:
- PostGIS extensie heeft geïnstalleerd
- BAG data bevat in de `verblijfsobject` tabel
- De benodigde kolommen heeft (id, gebruiksdoel, oppervlakte, geometrie, gemeente)

Voer de queries uit in `database/example-queries.sql` om te verifiëren.

## Stap 5: Start de Applicatie

In twee aparte terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open je browser op `http://localhost:5173`

## Troubleshooting

### TypeScript fouten verdwijnen niet
Herstart VS Code of voer uit:
```bash
# In beide folders
npm run typecheck
```

### Database connectie mislukt
Test de connectie:
```bash
psql $DATABASE_URL
```

### Module niet gevonden
Verwijder node_modules en installeer opnieuw:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Productie Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serveer de dist/ folder
```
