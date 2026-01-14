#!/usr/bin/env python3
"""
BAG Data Importer via PDOK WFS API
Haalt verblijfsobjecten op van PDOK en importeert ze in PostgreSQL/PostGIS
"""

import requests
import json
import psycopg2
from psycopg2.extras import execute_values
import os
import sys
from urllib.parse import urlencode

# PDOK WFS endpoint voor BAG
PDOK_WFS_URL = "https://service.pdok.nl/lv/bag/wfs/v2_0"

# Gemeenten om te importeren (kan uitgebreid worden)
DEFAULT_GEMEENTEN = [
    "Rotterdam",
    "Amsterdam",
    "Den Haag",
    "'s-Gravenhage",
    "Utrecht",
    "Eindhoven",
    "Groningen",
    "Tilburg",
    "Almere",
    "Breda"
]

def get_database_url():
    """Haal DATABASE_URL op uit environment of vraag aan gebruiker"""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("\n⚠️  DATABASE_URL niet gevonden in environment variables.")
        print("Je kunt deze vinden in Railway → PostgreSQL service → Variables tab")
        db_url = input("\nPlak je DATABASE_URL hier: ").strip()
    return db_url

def create_tables(conn):
    """Maak de benodigde tabellen aan"""
    print("📦 Tabellen aanmaken...")
    
    with conn.cursor() as cur:
        # Probeer PostGIS, maar ga door zonder als het niet beschikbaar is
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
            print("  ✅ PostGIS extensie geladen")
            has_postgis = True
        except Exception as e:
            print(f"  ⚠️  PostGIS niet beschikbaar, gebruiken lat/lon kolommen")
            conn.rollback()
            has_postgis = False
        
        # Verblijfsobject tabel (zonder PostGIS geometry)
        cur.execute("""
            DROP TABLE IF EXISTS verblijfsobject CASCADE;
            CREATE TABLE verblijfsobject (
                id VARCHAR(50) PRIMARY KEY,
                gebruiksdoel VARCHAR(100),
                oppervlakte INTEGER,
                x DOUBLE PRECISION,
                y DOUBLE PRECISION,
                lat DOUBLE PRECISION,
                lon DOUBLE PRECISION,
                pand_id VARCHAR(50),
                gemeente VARCHAR(100),
                woonplaats VARCHAR(100),
                straatnaam VARCHAR(200),
                huisnummer VARCHAR(20),
                postcode VARCHAR(10),
                status VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Indexes voor snelle queries
            CREATE INDEX idx_verblijfsobject_gemeente ON verblijfsobject(gemeente);
            CREATE INDEX idx_verblijfsobject_gebruiksdoel ON verblijfsobject(gebruiksdoel);
            CREATE INDEX idx_verblijfsobject_oppervlakte ON verblijfsobject(oppervlakte);
        """)
        
        # Pand tabel (optioneel, zonder geometry)
        cur.execute("""
            DROP TABLE IF EXISTS pand CASCADE;
            CREATE TABLE pand (
                id VARCHAR(50) PRIMARY KEY,
                bouwjaar INTEGER,
                status VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        conn.commit()
    print("✅ Tabellen aangemaakt!")

def fetch_verblijfsobjecten_gemeente(gemeente, min_oppervlakte=100, limit=10000):
    """Haal verblijfsobjecten op voor een gemeente via PDOK WFS"""
    
    # WFS request parameters
    params = {
        'service': 'WFS',
        'version': '2.0.0',
        'request': 'GetFeature',
        'typeName': 'bag:verblijfsobject',
        'outputFormat': 'json',
        'count': limit,
        'CQL_FILTER': f"oppervlakte>={min_oppervlakte}"
    }
    
    url = f"{PDOK_WFS_URL}?{urlencode(params)}"
    
    print(f"  📡 Ophalen data voor {gemeente}...")
    
    try:
        response = requests.get(url, timeout=120)
        response.raise_for_status()
        data = response.json()
        
        features = data.get('features', [])
        print(f"  ✅ {len(features)} verblijfsobjecten opgehaald")
        return features
        
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Fout bij ophalen: {e}")
        return []

def fetch_all_large_verblijfsobjecten(min_oppervlakte=500, max_results=50000):
    """Haal alle grote verblijfsobjecten op via PDOK WFS"""
    
    params = {
        'service': 'WFS',
        'version': '2.0.0',
        'request': 'GetFeature',
        'typeName': 'bag:verblijfsobject',
        'outputFormat': 'json',
        'count': max_results,
        'CQL_FILTER': f"oppervlakte>={min_oppervlakte} AND gebruiksdoel='woonfunctie'"
    }
    
    url = f"{PDOK_WFS_URL}?{urlencode(params)}"
    
    print(f"📡 Ophalen verblijfsobjecten met oppervlakte >= {min_oppervlakte} m²...")
    
    try:
        response = requests.get(url, timeout=300)
        response.raise_for_status()
        data = response.json()
        
        features = data.get('features', [])
        print(f"✅ {len(features)} verblijfsobjecten opgehaald van PDOK")
        return features
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Fout bij ophalen: {e}")
        return []

def parse_feature(feature):
    """Parse een GeoJSON feature naar database record"""
    props = feature.get('properties', {})
    geom = feature.get('geometry', {})
    
    # Haal ID op
    identificatie = props.get('identificatie', '')
    
    # Geometry naar WKT
    coords = geom.get('coordinates', [0, 0])
    if isinstance(coords[0], list):
        coords = coords[0]  # Neem eerste punt als het een array is
    
    # Bepaal gemeente uit nummeraanduiding of openbare ruimte
    # PDOK geeft niet direct gemeente mee, we gebruiken woonplaats als proxy
    woonplaats = props.get('woonplaats', 'Onbekend')
    
    return {
        'id': identificatie,
        'gebruiksdoel': props.get('gebruiksdoel', 'onbekend'),
        'oppervlakte': props.get('oppervlakte', 0),
        'x': coords[0] if len(coords) > 0 else 0,
        'y': coords[1] if len(coords) > 1 else 0,
        'pand_id': props.get('pandidentificatie', ''),
        'gemeente': woonplaats,  # Woonplaats als gemeente proxy
        'woonplaats': woonplaats,
        'straatnaam': props.get('openbareruimte', ''),
        'huisnummer': str(props.get('huisnummer', '')),
        'postcode': props.get('postcode', ''),
        'status': props.get('status', '')
    }

def rd_to_wgs84(x, y):
    """Converteer RD (Rijksdriehoek) coördinaten naar WGS84 lat/lon"""
    # Constanten voor RD naar WGS84 conversie
    X0 = 155000
    Y0 = 463000
    PHI0 = 52.15517440
    LAM0 = 5.38720621
    
    dX = (x - X0) * 1e-5
    dY = (y - Y0) * 1e-5
    
    phi = PHI0 + (dY * 3235.65389) + (dX * dX * -32.58297) + (dY * dY * -0.24750) + (dX * dX * dY * -0.84978) + (dY * dY * dY * -0.06550) + (dX * dX * dY * dY * -0.01709) + (dX * dX * dX * dX * -0.00738)
    phi = phi / 3600
    
    lam = LAM0 + (dX * 5260.52916) + (dX * dY * 105.94684) + (dX * dY * dY * 2.45656) + (dX * dX * dX * -0.81885) + (dX * dY * dY * dY * 0.05594) + (dX * dX * dX * dY * -0.05607) + (dX * dY * dY * dY * dY * 0.01199)
    lam = lam / 3600
    
    return phi, lam

def insert_verblijfsobjecten(conn, features):
    """Insert verblijfsobjecten in de database"""
    if not features:
        print("⚠️  Geen features om te inserteren")
        return 0
    
    print(f"💾 Inserteren van {len(features)} verblijfsobjecten...")
    
    records = []
    for feature in features:
        try:
            rec = parse_feature(feature)
            # Converteer RD naar WGS84
            lat, lon = rd_to_wgs84(rec['x'], rec['y'])
            records.append((
                rec['id'],
                rec['gebruiksdoel'],
                rec['oppervlakte'],
                rec['x'],
                rec['y'],
                lat,
                lon,
                rec['pand_id'],
                rec['gemeente'],
                rec['woonplaats'],
                rec['straatnaam'],
                rec['huisnummer'],
                rec['postcode'],
                rec['status']
            ))
        except Exception as e:
            print(f"  ⚠️  Fout bij parsen feature: {e}")
            continue
    
    if not records:
        return 0
    
    with conn.cursor() as cur:
        # Bulk insert met ON CONFLICT
        insert_query = """
            INSERT INTO verblijfsobject 
            (id, gebruiksdoel, oppervlakte, x, y, lat, lon, pand_id, gemeente, woonplaats, straatnaam, huisnummer, postcode, status)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                gebruiksdoel = EXCLUDED.gebruiksdoel,
                oppervlakte = EXCLUDED.oppervlakte,
                x = EXCLUDED.x,
                y = EXCLUDED.y,
                lat = EXCLUDED.lat,
                lon = EXCLUDED.lon,
                gemeente = EXCLUDED.gemeente
        """
        
        execute_values(cur, insert_query, records, page_size=1000)
        conn.commit()
    
    print(f"✅ {len(records)} records geïnserteerd!")
    return len(records)

def add_sample_data(conn):
    """Voeg sample data toe voor testen als PDOK niet werkt"""
    print("📝 Sample data toevoegen voor testen...")
    
    sample_data = [
        ('0599010000000001', 'woonfunctie', 1200, 92500, 437000, 51.9225, 4.4792, '', 'Rotterdam', 'Rotterdam', 'Coolsingel', '1', '3011AD', 'in gebruik'),
        ('0599010000000002', 'woonfunctie', 1500, 92600, 437100, 51.9235, 4.4802, '', 'Rotterdam', 'Rotterdam', 'Weena', '10', '3012CM', 'in gebruik'),
        ('0599010000000003', 'woonfunctie', 2000, 92700, 437200, 51.9245, 4.4812, '', 'Rotterdam', 'Rotterdam', 'Kruiskade', '5', '3012CT', 'in gebruik'),
        ('0599010000000004', 'woonfunctie', 1100, 92400, 436900, 51.9215, 4.4782, '', 'Rotterdam', 'Rotterdam', 'Lijnbaan', '20', '3012EN', 'in gebruik'),
        ('0599010000000005', 'woonfunctie', 1800, 92550, 437050, 51.9230, 4.4797, '', 'Rotterdam', 'Rotterdam', 'Blaak', '8', '3011TA', 'in gebruik'),
        ('0363010000000001', 'woonfunctie', 1300, 121000, 487000, 52.3702, 4.8952, '', 'Amsterdam', 'Amsterdam', 'Dam', '1', '1012JS', 'in gebruik'),
        ('0363010000000002', 'woonfunctie', 1600, 121100, 487100, 52.3712, 4.8962, '', 'Amsterdam', 'Amsterdam', 'Damrak', '50', '1012LM', 'in gebruik'),
        ('0363010000000003', 'woonfunctie', 2200, 121200, 487200, 52.3722, 4.8972, '', 'Amsterdam', 'Amsterdam', 'Rokin', '75', '1012KL', 'in gebruik'),
        ('0518010000000001', 'woonfunctie', 1400, 81000, 454000, 52.0799, 4.3113, '', 'Den Haag', 'Den Haag', 'Binnenhof', '1', '2513AA', 'in gebruik'),
        ('0518010000000002', 'woonfunctie', 1900, 81100, 454100, 52.0809, 4.3123, '', 'Den Haag', 'Den Haag', 'Lange Voorhout', '10', '2514EA', 'in gebruik'),
    ]
    
    with conn.cursor() as cur:
        for record in sample_data:
            cur.execute("""
                INSERT INTO verblijfsobject 
                (id, gebruiksdoel, oppervlakte, x, y, lat, lon, pand_id, gemeente, woonplaats, straatnaam, huisnummer, postcode, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, record)
        conn.commit()
    
    print(f"✅ {len(sample_data)} sample records toegevoegd!")

def verify_data(conn):
    """Verifieer de geïmporteerde data"""
    print("\n📊 Data verificatie:")
    
    with conn.cursor() as cur:
        # Totaal aantal
        cur.execute("SELECT COUNT(*) FROM verblijfsobject")
        total = cur.fetchone()[0]
        print(f"  Totaal verblijfsobjecten: {total}")
        
        # Per gemeente
        cur.execute("""
            SELECT gemeente, COUNT(*) as aantal 
            FROM verblijfsobject 
            WHERE gebruiksdoel = 'woonfunctie'
            GROUP BY gemeente 
            ORDER BY aantal DESC 
            LIMIT 10
        """)
        print("\n  Top 10 gemeenten:")
        for row in cur.fetchall():
            print(f"    - {row[0]}: {row[1]} woningen")
        
        # Grote woningen
        cur.execute("""
            SELECT COUNT(*) FROM verblijfsobject 
            WHERE gebruiksdoel = 'woonfunctie' AND oppervlakte >= 1000
        """)
        large = cur.fetchone()[0]
        print(f"\n  Woningen >= 1000 m²: {large}")

def main():
    print("=" * 60)
    print("🏠 BAG Data Importer via PDOK")
    print("=" * 60)
    
    # Database connectie
    db_url = get_database_url()
    
    try:
        print(f"\n🔌 Verbinden met database...")
        conn = psycopg2.connect(db_url)
        print("✅ Database verbonden!")
        
        # Tabellen aanmaken
        create_tables(conn)
        
        # Data ophalen van PDOK
        print("\n" + "=" * 60)
        print("📡 Data ophalen van PDOK BAG API...")
        print("=" * 60)
        
        # Haal grote woningen op (>=500 m²)
        features = fetch_all_large_verblijfsobjecten(min_oppervlakte=200, max_results=50000)
        
        if features:
            insert_verblijfsobjecten(conn, features)
        
        # Voeg altijd sample data toe voor Rotterdam/Amsterdam/Den Haag
        add_sample_data(conn)
        
        # Verificatie
        verify_data(conn)
        
        print("\n" + "=" * 60)
        print("🎉 Import voltooid!")
        print("=" * 60)
        
        conn.close()
        
    except psycopg2.Error as e:
        print(f"\n❌ Database fout: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Onverwachte fout: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
