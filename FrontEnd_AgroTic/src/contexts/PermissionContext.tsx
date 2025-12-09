import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser, loginUser, refreshToken, getAccessTokenExpiration, isTokenExpiringSoon } from '../services/authService';
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
  const refreshTimerRef = useRef<number | null>(null);
  const lastRefreshAttemptRef = useRef<number>(0);

  // Helper functions for cookie management
  const savePermissionsToCookie = (permissions: Permission[]) => {
    Cookies.set('user_permissions', JSON.stringify(permissions), {
      expires: 7, // 7 days
      secure: import.meta.env.PROD,
      sameSite: 'strict'
    });
  };

  const clearClientCookies = () => {
    Cookies.remove('user_permissions');
  };

  // Check if we have a valid session by checking for any auth-related cookies
  const hasValidSession = (): boolean => {
    // Check for any authentication indicators
    const hasPermissions = Cookies.get('user_permissions') !== undefined;
    // You might want to add more checks here for other auth indicators
    return hasPermissions;
  };

  const clearAuthState = () => {
    console.log('PermissionContext: Clearing authentication state');
    setUser(null);
    updatePermissions([]);
    clearClientCookies();
    setIsAuthenticated(false);
    setIsRefreshing(false);
    setIsInitializing(false);
    
    // Clear proactive refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

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
      
      // Start proactive token refresh
      scheduleProactiveRefresh();
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
      
      // Restart proactive refresh after successful refresh
      scheduleProactiveRefresh();
    } catch (error) {
      console.error('PermissionContext: Refresh failed:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Proactive token refresh mechanism
  const scheduleProactiveRefresh = useCallback(() => {
    // Don't refresh too frequently (minimum 30 seconds between attempts)
    const now = Date.now();
    if (now - lastRefreshAttemptRef.current < 30000) {
      console.log('PermissionContext: Skipping proactive refresh, too soon since last attempt');
      return;
    }
    lastRefreshAttemptRef.current = now;

    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Check if token is expiring soon (within 5 minutes)
    if (isTokenExpiringSoon(5)) {
      console.log('PermissionContext: Token expiring soon, refreshing proactively');
      // Refresh immediately if token is expiring soon
      refresh().catch(error => {
        console.error('PermissionContext: Proactive refresh failed:', error);
      });
    } else {
      // Schedule next check in 1 minute
      const nextCheckTime = 60 * 1000; // 1 minute
      refreshTimerRef.current = window.setTimeout(() => {
        scheduleProactiveRefresh();
      }, nextCheckTime);
    }
  }, [refresh]);

  const logout = async (): Promise<void> => {
    try {
      await logoutUser(); // This clears localStorage and sessionStorage, backend clears HTTP-only cookies
      clearAuthState();
      navigate('/login'); // Redirect to login
    } catch (error) {
      console.error('Logout failed:', error);
      // Even on error, clear client-side data
      clearAuthState();
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
      console.log('PermissionContext: Checking for existing session...');

      // Check if we have a valid session
      const hasSession = hasValidSession();

      console.log('PermissionContext: All cookies:', document.cookie);
      console.log('PermissionContext: Valid session present:', hasSession);

      if (!hasSession) {
        console.log('PermissionContext: No valid session found, user is not authenticated');
        clearAuthState();
        setupAxiosInterceptors(refresh, navigate, logout);
        return;
      }

      try {
        console.log('PermissionContext: Session found, attempting to get profile...');
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
        
        // Start proactive token refresh for existing session
        scheduleProactiveRefresh();
      } catch (error: any) {
        console.log('PermissionContext: Profile fetch failed:', error);

        // If the error is 401, it means tokens are invalid/expired
        if (error.response?.status === 401) {
          console.log('PermissionContext: Got 401 error, session is invalid');
          clearAuthState();
          navigate('/login');
          return;
        }

        // For other errors, try to refresh token as a fallback
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
          
          // Start proactive token refresh after successful recovery
          scheduleProactiveRefresh();
        } catch (refreshError: any) {
          console.log('PermissionContext: Token refresh failed:', refreshError);
          
          // If refresh also fails with 401, clear the session
          if (refreshError.response?.status === 401) {
            console.log('PermissionContext: Refresh failed with 401, clearing session');
            clearAuthState();
            navigate('/login');
          } else {
            console.log('PermissionContext: Unexpected refresh error, treating as no session');
            clearAuthState();
          }
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