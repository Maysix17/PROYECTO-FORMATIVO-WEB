import React, { useState, useEffect } from 'react';
import { usePermission } from '../../contexts/PermissionContext';

interface TokenRefreshNotificationProps {
  className?: string;
}

export const TokenRefreshNotification: React.FC<TokenRefreshNotificationProps> = ({ 
  className = '' 
}) => {
  const { isRefreshing } = usePermission();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isRefreshing) {
      setShowNotification(true);
      // Auto-hide after 3 seconds if it's still refreshing
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Hide immediately when not refreshing
      setShowNotification(false);
    }
  }, [isRefreshing]);

  if (!showNotification) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 max-w-sm">
        <div className="flex-shrink-0">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="text-sm font-medium">
          {isRefreshing ? 'Renovando sesión automáticamente...' : 'Sesión renovada'}
        </span>
      </div>
    </div>
  );
};