// src/services/profileService.ts
import apiClient from "../lib/axios/axios"; // Asegúrate que la ruta a tu cliente axios es correcta
import type { User } from '../types/user'; // Deberás crear este tipo basado en tu entidad de backend

// Define el tipo para los datos que se pueden actualizar
export interface UpdateProfilePayload {
  nombres?: string;
  apellidos?: string;
  dni?: number;
  telefono?: number;
  correo?: string;
}

/**
 * Obtiene los datos del perfil del usuario autenticado.
 */
export const getProfile = async (): Promise<User> => {
  console.log("ProfileService: Attempting to get user profile");
  console.log("ProfileService: Current cookies:", document.cookie);

  try {
    const response = await apiClient.get<User>("/usuarios/me");
    console.log("ProfileService: Profile fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("ProfileService: Error al obtener el perfil:", error);
    console.error("ProfileService: Error response:", (error as any)?.response);
    throw error;
  }
};

/**
 * Actualiza los datos del perfil del usuario autenticado.
 */
export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<User> => {
  try {
    // Aseguramos que el teléfono se envíe como número si existe
    const dataToSend = {
      ...payload,
      ...(payload.telefono && { telefono: Number(payload.telefono) }),
    };

    const response = await apiClient.patch<(User)>("/usuarios/me", dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    throw error;
  }
};