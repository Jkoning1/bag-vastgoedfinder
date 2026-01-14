import axios from 'axios';
import { Verblijfsobject } from '../types';

const PDOK_WFS_URL = 'https://service.pdok.nl/lv/bag/wfs/v2_0';

/**
 * Fetch verblijfsobjecten from PDOK WFS API
 */
export async function fetchFromPDOK(
  gemeente: string,
  minOppervlakte: number
): Promise<Verblijfsobject[]> {
  try {
    const params = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'bag:verblijfsobject',
      outputFormat: 'json',
      count: 1000,
      CQL_FILTER: `oppervlakte>=${minOppervlakte} AND gebruiksdoel='woonfunctie'`
    };

    const response = await axios.get(PDOK_WFS_URL, {
      params,
      timeout: 30000
    });

    const features = response.data?.features || [];
    
    return features.map((feature: any) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [0, 0];
      
      // Extract gemeente from woonplaats as proxy
      const woonplaats = props.woonplaats || 'Onbekend';
      
      return {
        id: props.identificatie || '',
        oppervlakte: props.oppervlakte || 0,
        gemeente: woonplaats,
        geometry: {
          type: 'Point',
          coordinates: coords
        }
      };
    }).filter((v: Verblijfsobject) => 
      // Filter by gemeente if specified
      !gemeente || v.gemeente.toLowerCase().includes(gemeente.toLowerCase())
    );
    
  } catch (error) {
    console.error('PDOK API error:', error);
    return [];
  }
}

/**
 * RD to WGS84 conversion
 */
export function rdToWgs84(x: number, y: number): [number, number] {
  const X0 = 155000;
  const Y0 = 463000;
  const PHI0 = 52.15517440;
  const LAM0 = 5.38720621;
  
  const dX = (x - X0) * 1e-5;
  const dY = (y - Y0) * 1e-5;
  
  let phi = PHI0 + (dY * 3235.65389) + (dX * dX * -32.58297) + (dY * dY * -0.24750) + 
            (dX * dX * dY * -0.84978) + (dY * dY * dY * -0.06550) + 
            (dX * dX * dY * dY * -0.01709) + (dX * dX * dX * dX * -0.00738);
  phi = phi / 3600;
  
  let lam = LAM0 + (dX * 5260.52916) + (dX * dY * 105.94684) + (dX * dY * dY * 2.45656) + 
            (dX * dX * dX * -0.81885) + (dX * dY * dY * dY * 0.05594) + 
            (dX * dX * dX * dY * -0.05607) + (dX * dY * dY * dY * dY * 0.01199);
  lam = lam / 3600;
  
  return [lam, phi]; // [lon, lat]
}
