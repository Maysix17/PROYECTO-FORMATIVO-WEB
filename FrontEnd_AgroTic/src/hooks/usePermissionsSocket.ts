import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePermission } from '../contexts/PermissionContext';
import apiClient from '../lib/axios/axios';

export const usePermissionsSocket = () => {
  const { isAuthenticated, refresh } = usePermission();
  const socketRef = useRef<Socket | null>(null);
  const [wsToken, setWsToken] = useState<string | null>(null);

  // Fetch WebSocket token when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchToken = async () => {
        try {
          const response = await apiClient.get('/auth/ws-token');
          setWsToken(response.data.token);
        } catch (error) {
          console.error('Failed to fetch WebSocket token:', error);
        }
      };
      fetchToken();
    } else {
      setWsToken(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && wsToken) {
      socketRef.current = io(`${import.meta.env.VITE_API_URL}/permissions`, {
        auth: {
          token: wsToken,
        },
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to permissions WebSocket');
      });

      socketRef.current.on('permissionChanged', async (payload) => {
        console.log('Permission changed:', payload);
        // If allPermissions are provided in the payload, log them for debugging
        if (payload.allPermissions) {
          console.log('Received cached permissions from WebSocket:', payload.allPermissions.length, 'permission groups');
        }
        try {
          await refresh(); // Refresh permissions
          console.log('Permissions refreshed successfully after WebSocket event');

          // Force page reload to ensure UI updates with new permissions
          console.log('Reloading page to apply permission changes...');
          window.location.reload();
        } catch (error) {
          console.error('Failed to refresh permissions after WebSocket event:', error);
          // Force reload even on error to ensure UI consistency
          window.location.reload();
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from permissions WebSocket');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, wsToken, refresh]);
};