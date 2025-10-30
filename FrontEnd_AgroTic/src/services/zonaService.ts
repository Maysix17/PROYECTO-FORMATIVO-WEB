import apiClient from '../lib/axios/axios';

export const zonaService = {
  async getAll() {
    const response = await apiClient.get('/zonas');
    return response.data;
  },

  async create(zonaData: {
    nombre: string;
    coordenadas: {
      type: 'point' | 'polygon';
      coordinates: { lat: number; lng: number } | Array<{ lat: number; lng: number }>;
    };
    areaMetrosCuadrados?: number;
    fkMapaId?: string;
  }) {
    const response = await apiClient.post('/zonas', zonaData);
    return response.data;
  },
};

export default zonaService;