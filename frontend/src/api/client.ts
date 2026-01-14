import axios from 'axios';
import { VerblijfsobjectResponse, GemeentenResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  /**
   * Fetch verblijfsobjecten with filters
   */
  async getVerblijfsobjecten(gemeente: string, minOppervlakte: number): Promise<VerblijfsobjectResponse> {
    const response = await axios.get<VerblijfsobjectResponse>(`${API_BASE_URL}/verblijfsobjecten`, {
      params: { gemeente, minOppervlakte }
    });
    return response.data;
  },

  /**
   * Fetch list of available gemeenten
   */
  async getGemeenten(): Promise<string[]> {
    const response = await axios.get<GemeentenResponse>(`${API_BASE_URL}/gemeenten`);
    return response.data.gemeenten;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  }
};
