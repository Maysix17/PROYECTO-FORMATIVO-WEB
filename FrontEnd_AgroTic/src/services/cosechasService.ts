import apiClient from '../lib/axios/axios';
import type { Cosecha, CreateCosechaDto } from '../types/cosechas.types';

export const createCosecha = async (data: CreateCosechaDto): Promise<Cosecha> => {
  const response = await apiClient.post('/cosechas', data);
  return response.data;
};

export const getCosechas = async (): Promise<Cosecha[]> => {
  const response = await apiClient.get('/cosechas');
  return response.data;
};

export const getCosechasToday = async (): Promise<Cosecha[]> => {
  const response = await apiClient.get('/cosechas/today');
  return response.data;
};

export const getCosechasByCultivo = async (cvzId: string): Promise<Cosecha[]> => {
  const response = await apiClient.get(`/cosechas/cultivo/${cvzId}`);
  return response.data;
};

export const getCosechasAbiertasByCultivo = async (cvzId: string): Promise<Cosecha[]> => {
  const response = await apiClient.get(`/cosechas/cultivo/${cvzId}/abiertas`);
  return response.data;
};

export const updateCosecha = async (id: string, data: Partial<Cosecha>): Promise<Cosecha> => {
  const response = await apiClient.patch(`/cosechas/${id}`, data);
  return response.data;
};

export const deleteCosecha = async (id: string): Promise<void> => {
  await apiClient.delete(`/cosechas/${id}`);
};

export const closeHarvest = async (id: string): Promise<Cosecha> => {
  const response = await apiClient.post(`/cosechas/${id}/close`);
  return response.data;
};

export const getCantidadDisponible = async (id: string): Promise<number> => {
  const response = await apiClient.get(`/cosechas/${id}/disponible`);
  return response.data;
};

export const closeAllHarvestsByCultivo = async (cvzId: string): Promise<Cosecha[]> => {
  const response = await apiClient.post(`/cosechas/cultivo/${cvzId}/close-all`);
  return response.data;
};

export const closeAllHarvestSalesByCultivo = async (cvzId: string): Promise<Cosecha[]> => {
  const response = await apiClient.post(`/cosechas/cultivo/${cvzId}/close-all-sales`);
  return response.data;
};