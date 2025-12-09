import apiClient from "../lib/axios/axios";
import type { RegisterPayload, RegisterFormData, LoginPayload } from "../types/Auth";

export const registerUser = async (
  formData: RegisterFormData
): Promise<any> => {

  console.log(apiClient)
  try {
    // Mapeo y conversión de datos para el backend
    const payload: RegisterPayload = {
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      dni: parseInt(formData.dni, 10),
      telefono: parseInt(formData.telefono, 10),
      correo: formData.email, // Mapeo de 'email' a 'correo'
      password: formData.password,
    };
    console.log(payload)


    const response = await apiClient.post("/auth/register", payload);


    return response.data;

    console.log(payload)
    console.log(response)

  } catch (error) {
    console.error("Error en el registro:", error);
    // Puedes manejar el error de forma más específica si lo necesitas
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    // Only attempt logout if we think we have valid tokens
    // Don't throw error if logout fails due to 401 (token already expired)
    try {
      await apiClient.post("/auth/logout");
    } catch (logoutError: any) {
      // If logout fails with 401, it means tokens are already invalid/expired
      // This is expected behavior, don't treat it as an error
      if (logoutError.response?.status === 401) {
        console.log("Logout: Token already invalid/expired, proceeding with cleanup");
      } else {
        console.warn("Logout: Unexpected error:", logoutError);
        // For other errors, we still proceed with cleanup
      }
    }
    
    // Always clear local storage and session storage regardless of API call result
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.error("Error during logout:", error);
    // Don't throw error for logout failures, just clean up locally
    localStorage.clear();
    sessionStorage.clear();
  }
};

export const loginUser = async (payload: LoginPayload): Promise<void> => {
  try {
    console.log("AuthService: Attempting login with payload:", { ...payload, password: '[REDACTED]' });
    const response = await apiClient.post("/auth/login", payload);
    console.log("AuthService: Login response:", response.data);
    console.log("AuthService: Cookies after login:", document.cookie);
    return response.data;
  } catch (error) {
    console.error("AuthService: Login failed:", error);
    console.error("AuthService: Login error response:", (error as any)?.response?.data);
    throw error;
  }
};

export const refreshToken = async (): Promise<void> => {
  console.log("AuthService: Attempting to refresh token");
  console.log("AuthService: Current cookies for refresh:", document.cookie);

  try {
    const response = await apiClient.post("/auth/refresh");
    console.log("AuthService: Token refresh successful, new cookies:", document.cookie);
    console.log("AuthService: Refresh response:", response.data);
  } catch (error) {
    console.error("AuthService: Refresh failed:", error);
    console.error("AuthService: Refresh error response:", (error as any)?.response);
    throw error;
  }
};

export const getAccessTokenExpiration = (): Date | null => {
  try {
    // Get the access token from cookies
    const accessTokenCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='));
    
    if (!accessTokenCookie) {
      return null;
    }

    const token = accessTokenCookie.split('=')[1];
    if (!token) {
      return null;
    }

    // Decode JWT token to get expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    
    return new Date(expirationTime);
  } catch (error) {
    console.error("Error getting token expiration:", error);
    return null;
  }
};

export const isTokenExpiringSoon = (bufferMinutes: number = 5): boolean => {
  const expiration = getAccessTokenExpiration();
  if (!expiration) {
    return true; // Assume expiring if we can't determine
  }

  const now = new Date();
  const bufferTime = bufferMinutes * 60 * 1000; // Convert minutes to milliseconds
  const thresholdTime = new Date(expiration.getTime() - bufferTime);

  return now >= thresholdTime;
};

export const registerAdminUser = async (formData: any): Promise<any> => {
  // Convert string values to appropriate types for backend
  const payload = {
    ...formData,
    dni: parseInt(formData.dni, 10),
    telefono: parseInt(formData.telefono, 10),
  };

  const response = await apiClient.post("/usuarios/register", payload);
  return response.data;
};

export const updateAdminUser = async (userId: string, formData: any): Promise<any> => {
  // Convert string values to appropriate types for backend
  const payload = {
    ...formData,
    dni: formData.dni ? parseInt(formData.dni, 10) : undefined,
    telefono: formData.telefono ? parseInt(formData.telefono, 10) : undefined,
  };

  // Remove empty strings and undefined values
  Object.keys(payload).forEach(key => {
    if (payload[key] === '' || payload[key] === undefined) {
      delete payload[key];
    }
  });

  const response = await apiClient.patch(`/usuarios/${userId}`, payload);
  return response.data;
};

