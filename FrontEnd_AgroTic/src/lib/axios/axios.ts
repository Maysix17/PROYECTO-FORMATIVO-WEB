import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshFunction: (() => Promise<void>) | null = null;
let navigateFunction: ((path: string) => void) | null = null;
let logoutFunction: (() => Promise<void>) | null = null;
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

export const setupAxiosInterceptors = (
  refresh: () => Promise<void>,
  navigate: (path: string) => void,
  logout?: () => Promise<void>
) => {
  refreshFunction = refresh;
  navigateFunction = navigate;
  logoutFunction = logout || null;

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Only try to refresh tokens for 401 errors that are NOT:
      // 1. Already retried
      // 2. Auth endpoints (/auth/*)
      // 3. Profile endpoint (/usuarios/me) - this is the initial auth check
      // 4. WebSocket token endpoint
      const isAuthEndpoint = error.config.url.startsWith('/auth/');
      const isProfileEndpoint = error.config.url.includes('/usuarios/me');
      const isWsTokenEndpoint = error.config.url.includes('/auth/ws-token');
      
      if (error.response?.status === 401 &&
          refreshFunction &&
          !error.config._retry &&
          !isAuthEndpoint &&
          !isProfileEndpoint &&
          !isWsTokenEndpoint) {
        
        // If already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push(() => {
              error.config._retry = true;
              apiClient(error.config).then(resolve).catch(reject);
            });
          });
        }

        try {
          console.log('Axios interceptor: Attempting token refresh for failed request');
          isRefreshing = true;
          await refreshFunction();
          console.log('Axios interceptor: Token refresh successful');
          
          // Mark the request as retried
          error.config._retry = true;
          
          // Process queued requests
          const queuedRequests = [...refreshQueue];
          refreshQueue = [];
          queuedRequests.forEach(callback => callback());
          
          // Retry the original request
          console.log('Axios interceptor: Retrying original request after refresh');
          return apiClient(error.config);
        } catch (refreshError) {
          console.log('Axios interceptor: Token refresh failed, logging out user');
          
          // Clear queue
          refreshQueue = [];
          
          // Refresh failed, logout and redirect to login
          if (logoutFunction) {
            try {
              await logoutFunction();
            } catch (logoutErr) {
              // Even if logout fails, we should still redirect
              console.warn('Logout failed during refresh error handling:', logoutErr);
            }
          } else if (navigateFunction) {
            navigateFunction('/login');
          }
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
};

export default apiClient;
