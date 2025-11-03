import apiClient from '../lib/axios/axios';

export interface Actividad {
  id: string;
  descripcion: string;
  fechaAsignacion: string;
  horasDedicadas: number;
  observacion: string;
  estado: boolean;
  fkCultivoVariedadZonaId: string;
  fkCategoriaActividadId: string;
  imgUrl?: string;
  dniResponsable?: number;
}

export interface CreateActividadData {
  descripcion: string;
  fechaAsignacion: string;
  horasDedicadas?: number;
  observacion?: string;
  estado: boolean;
  fkCultivoVariedadZonaId: string;
  fkCategoriaActividadId: string;
}

export interface UsuarioXActividad {
  fkUsuarioId: string;
  fkActividadId: string;
  fechaAsignacion: Date;
}

export interface InventarioXActividad {
  fkInventarioId: string;
  fkActividadId: string;
  cantidadUsada: number;
}

export interface Movimiento {
  fkInventarioId: string;
  stockReservado?: number;
  stockDevuelto?: number;
  stockDevueltoSobrante?: number;
  stockReservadoSobrante?: number;
}

export interface Reservation {
  id: string;
  fkActividadId: string;
  fkLoteId: string;
  fkEstadoId: number;
  cantidadReservada: number;
  cantidadUsada?: number;
  cantidadDevuelta?: number;
  actividad?: Actividad;
  lote?: any; // LotesInventario
  estado?: any; // EstadoReserva
}

export interface CreateReservationData {
  loteId: string;
  cantidadReservada: number;
  estadoId?: number;
}

export interface CreateReservationByProductData {
  productId: string;
  cantidadReservada: number;
  estadoId?: number;
}

export interface ConfirmUsageData {
  cantidadUsada: number;
}

export const getActividadesByDateRange = async (start: string, end: string): Promise<Actividad[]> => {
  const response = await apiClient.get(`/actividades/by-date-range?start=${start}&end=${end}`);
  return response.data;
};

export const getActividadesCountByDate = async (date: string): Promise<number> => {
  const response = await apiClient.get(`/actividades/count-by-date/${date}`);
  return response.data;
};

export const getActividadesByDate = async (date: string): Promise<Actividad[]> => {
  const response = await apiClient.get(`/actividades/by-date/${date}`);
  return response.data;
};

export const getActividadesByDateWithActive = async (date: string): Promise<Actividad[]> => {
  const response = await apiClient.get(`/actividades/by-date-active/${date}`);
  return response.data;
};

export const createActividad = async (data: CreateActividadData): Promise<Actividad> => {
  const response = await apiClient.post('/actividades', data);
  return response.data;
};

export const updateActividad = async (id: string, data: Partial<Actividad>): Promise<void> => {
  await apiClient.patch(`/actividades/${id}`, data);
};

export const deleteActividad = async (id: string): Promise<void> => {
  await apiClient.delete(`/actividades/${id}`);
};

export const uploadActividadEvidence = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/actividades/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const createUsuarioXActividad = async (data: UsuarioXActividad): Promise<void> => {
  await apiClient.post('/usuarios-x-actividades', data);
};

export const createInventarioXActividad = async (data: InventarioXActividad): Promise<void> => {
  await apiClient.post('/inventario-x-actividades', data);
};

export const createMovimiento = async (data: Movimiento): Promise<void> => {
  await apiClient.post('/movimientos', data);
};

export const finalizarActividad = async (id: string, data: { observacion?: string; imgUrl?: File; horas?: number; precioHora?: number }): Promise<void> => {
  console.log(`[${new Date().toISOString()}] 📤 FRONTEND: Finalizing activity ${id} with evidence upload`);
  const formData = new FormData();
  if (data.observacion) formData.append('observacion', data.observacion);
  if (data.imgUrl) {
    formData.append('imgUrl', data.imgUrl);
    console.log(`[${new Date().toISOString()}] 📎 FRONTEND: Attaching image evidence for activity ${id} - File: ${data.imgUrl.name}, Size: ${data.imgUrl.size} bytes`);
  } else {
    console.log(`[${new Date().toISOString()}] 📝 FRONTEND: Finalizing activity ${id} without image evidence`);
  }
  if (data.horas !== undefined) formData.append('horas', data.horas.toString());
  if (data.precioHora !== undefined) formData.append('precioHora', data.precioHora.toString());

  try {
    await apiClient.patch(`/actividades/${id}/finalizar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log(`[${new Date().toISOString()}] ✅ FRONTEND: Activity ${id} finalized successfully with evidence uploaded`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ FRONTEND: Error finalizing activity ${id}:`, error);
    throw error;
  }
};

export const createReservation = async (actividadId: string, data: CreateReservationData): Promise<Reservation> => {
  const response = await apiClient.post(`/actividades/${actividadId}/reservas`, data);
  return response.data;
};

export const createReservationByProduct = async (actividadId: string, data: CreateReservationByProductData): Promise<Reservation> => {
  const response = await apiClient.post(`/actividades/${actividadId}/reservas/producto`, data);
  return response.data;
};

export const confirmUsage = async (reservaId: string, data: ConfirmUsageData): Promise<void> => {
  await apiClient.patch(`/actividades/reservas/${reservaId}/confirm-usage`, data);
};

export const getReservationsByActivity = async (actividadId: string): Promise<Reservation[]> => {
  const response = await apiClient.get(`/actividades/${actividadId}/reservas`);
  return response.data;
};

export const getActividadesByCultivoVariedadZonaId = async (cvzId: string): Promise<any[]> => {
  const response = await apiClient.get(`/actividades/by-cultivo-variedad-zona/${cvzId}`);
  return response.data;
};