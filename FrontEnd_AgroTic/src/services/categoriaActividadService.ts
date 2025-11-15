import apiClient from '../lib/axios/axios';

export interface CategoriaActividadData {
  id?: string;
  nombre: string;
}

export const getCategoriaActividades = async (): Promise<CategoriaActividadData[]> => {
  const response = await apiClient.get('/categoria-actividad');
  return response.data || [];
};

export const createCategoriaActividad = async (data: { nombre: string }): Promise<CategoriaActividadData> => {
  const response = await apiClient.post('/categoria-actividad', data);
  return response.data;
};

export const updateCategoriaActividad = async (id: string, data: { nombre: string }): Promise<CategoriaActividadData> => {
  const response = await apiClient.patch(`/categoria-actividad/${id}`, data);
  return response.data;
};

export const deleteCategoriaActividad = async (id: string): Promise<void> => {
  await apiClient.delete(`/categoria-actividad/${id}`);
};

export const searchCategoriaActividades = async (query: string, page: number = 1, limit: number = 10) => {
  const response = await apiClient.get(`/categoria-actividad/search/${query}?page=${page}&limit=${limit}`);
  return response.data;
};