import { usePermission } from '../contexts/PermissionContext';

/**
 * Hook to manage token refresh status and notifications
 * Provides easy access to refresh state and utility functions
 */
export const useTokenRefresh = () => {
  const { 
    isRefreshing, 
    isAuthenticated, 
    refresh 
  } = usePermission();

  /**
   * Check if the user should see a refresh notification
   * Shows notification during active refresh or shortly after
   */
  const shouldShowRefreshNotification = isRefreshing;

  /**
   * Manually trigger a token refresh
   * Useful for user-initiated refresh or testing
   */
  const manualRefresh = async () => {
    try {
      await refresh();
      return true;
    } catch (error) {
      console.error('Manual refresh failed:', error);
      return false;
    }
  };

  /**
   * Get time until next automatic refresh (estimated)
   * Returns null if no session or unable to determine
   */
  const getTimeUntilNextRefresh = (): number | null => {
    if (!isAuthenticated) return null;
    
    try {
      // This would require access to the token expiration
      // For now, return a conservative estimate
      return 5 * 60 * 1000; // 5 minutes
    } catch (error) {
      return null;
    }
  };

  return {
    isRefreshing,
    isAuthenticated,
    shouldShowRefreshNotification,
    manualRefresh,
    getTimeUntilNextRefresh,
    refresh
  };
};