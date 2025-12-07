import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, loginUser, refreshToken } from '../services/authService';
import type { Permission, LoginPayload } from '../types/Auth';
import type { User } from '../types/user';
import { setupAxiosInterceptors } from '../lib/axios/axios';
import { getProfile } from '../services/profileService';
import Cookies from 'js-cookie';

interface PermissionContextType {
  user: User | null;
  permissions: Permission[];
  lastUpdate: number;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  isInitializing: boolean;
  hasPermission: (modulo: string, recurso: string, accion: string) => boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: Permission[]) => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const initRef = useRef<boolean>(false);

  // Helper functions for cookie management
  const savePermissionsToCookie = (permissions: Permission[]) => {
    Cookies.set('user_permissions', JSON.stringify(permissions), {
      expires: 7, // 7 days
      secure: import.meta.env.PROD,
      sameSite: 'strict'
    });
  };

  // const loadPermissionsFromCookie = (): Permission[] => {
  //   const cookieData = Cookies.get('user_permissions');
  //   if (cookieData) {
  //     try {
  //       return JSON.parse(cookieData);
  //     } catch (error) {
  //       console.error('Error parsing permissions from cookie:', error);
  //       return [];
  //     }
  //   }
  //   return [];
  // };

  // const clearPermissionsCookie = () => {
  //   Cookies.remove('user_permissions');
  // };

  const updatePermissions = (newPermissions: Permission[]) => {
    setPermissions(newPermissions);
    setLastUpdate(Date.now());
  };

  const hasPermission = (modulo: string, recurso: string, accion: string): boolean => {
    const result = permissions.some(p => p.modulo === modulo && p.recurso === recurso && p.accion === accion);
    console.log(`hasPermission check: modulo=${modulo}, recurso=${recurso}, accion=${accion} => ${result}`);
    console.log('All permissions:', permissions);
    return result;
  };

  const login = async (payload: LoginPayload): Promise<void> => {
    try {
      await loginUser(payload);
      const profile = await getProfile();
      setUser(profile);
      const mappedPermissions = (profile.rol.permisos as any[]).map(p => ({
        modulo: p.recurso.modulo.nombre,
        recurso: p.recurso.nombre,
        accion: p.accion,
      }));
      updatePermissions(mappedPermissions);
      savePermissionsToCookie(mappedPermissions); // Save to cookies

      console.log('Login successful:', profile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const refresh = useCallback(async (): Promise<void> => {
    console.log('PermissionContext: Starting refresh');
    setIsRefreshing(true);
    try {
      await refreshToken();
      console.log('PermissionContext: refreshToken successful');
      const profile = await getProfile();
      console.log('PermissionContext: getProfile successful', profile);
      setUser(profile);
      const mappedPermissions = (profile.rol.permisos as any[]).map(p => ({
        modulo: p.recurso.modulo.nombre,
        recurso: p.recurso.nombre,
        accion: p.accion,
      }));
      updatePermissions(mappedPermissions);
      savePermissionsToCookie(mappedPermissions); // Save to cookies
      setIsAuthenticated(true);
    } catch (error) {
      console.error('PermissionContext: Refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Note: HTTP-only cookies (access_token, refresh_token) are cleared by the backend
  // Only clear client-accessible cookies
  const clearClientCookies = () => {
    Cookies.remove('user_permissions');
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutUser(); // This clears localStorage and sessionStorage, backend clears HTTP-only cookies
      setUser(null);
      updatePermissions([]);
      clearClientCookies(); // Clear client-accessible cookies
      setIsAuthenticated(false);
      navigate('/login'); // Redirect to login
    } catch (error) {
      console.error('Logout failed:', error);
      // Even on error, clear client-side data
      setUser(null);
      updatePermissions([]);
      clearClientCookies();
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current) {
      console.log('PermissionContext: Skipping duplicate initialization');
      return;
    }
    initRef.current = true;

    const init = async () => {
      console.log('PermissionContext: Starting app initialization');
      setIsInitializing(true);
      console.log('PermissionContext: Checking for existing cookies...');

      // Check if we have user_permissions cookie that indicates a potential session
      const hasPermissions = Cookies.get('user_permissions') !== undefined;

      console.log('PermissionContext: All cookies:', document.cookie);
      console.log('PermissionContext: user_permissions cookie present:', hasPermissions);

      if (!hasPermissions) {
        console.log('PermissionContext: No permissions cookie found, user is not authenticated');
        setUser(null);
        updatePermissions([]);
        clearClientCookies();
        setIsAuthenticated(false);
        setupAxiosInterceptors(refresh, navigate, logout);
        setIsInitializing(false);
        return;
      }

      try {
        console.log('PermissionContext: Tokens found, attempting to get profile...');
        const profile = await getProfile();
        console.log('PermissionContext: Profile loaded successfully', profile);
        setUser(profile);
        const mappedPermissions = (profile.rol.permisos as any[]).map(p => ({
          modulo: p.recurso.modulo.nombre,
          recurso: p.recurso.nombre,
          accion: p.accion,
        }));
        updatePermissions(mappedPermissions);
        savePermissionsToCookie(mappedPermissions);
        setIsAuthenticated(true);
        console.log('PermissionContext: User authenticated successfully');
      } catch (error) {
        console.log('PermissionContext: Profile fetch failed, trying refresh token...', error);

        // Try to refresh token if profile fetch failed
        try {
          console.log('PermissionContext: Attempting token refresh...');
          await refreshToken();
          console.log('PermissionContext: Token refresh successful, retrying profile...');

          const profile = await getProfile();
          console.log('PermissionContext: Profile loaded after refresh', profile);
          setUser(profile);
          const mappedPermissions = (profile.rol.permisos as any[]).map(p => ({
            modulo: p.recurso.modulo.nombre,
            recurso: p.recurso.nombre,
            accion: p.accion,
          }));
          updatePermissions(mappedPermissions);
          savePermissionsToCookie(mappedPermissions);
          setIsAuthenticated(true);
          console.log('PermissionContext: User authenticated after refresh');
        } catch (refreshError) {
          console.log('PermissionContext: Token refresh also failed, user not authenticated:', refreshError);
          setUser(null);
          updatePermissions([]);
          clearClientCookies();
          setIsAuthenticated(false);
          setIsInitializing(false);
          console.log('PermissionContext: User set as not authenticated after refresh failure');
        }
      }

      setupAxiosInterceptors(refresh, navigate, logout);
      setIsInitializing(false);
    };
    init();
  }, []); // Empty dependency array to run only once

  const value: PermissionContextType = {
    user,
    permissions,
    lastUpdate,
    isAuthenticated,
    isRefreshing,
    isInitializing,
    hasPermission,
    login,
    logout,
    refresh,
    setUser,
    setPermissions: updatePermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};