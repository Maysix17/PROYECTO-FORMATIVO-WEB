import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '../types/notification.types';

export const useNotificationsSocket = (onNotification?: (notification: Notification) => void) => {
  const handleNotification = useCallback((notification: Notification) => {
    console.log('[DEBUG] useNotificationsSocket: Received notification:', notification);
    if (onNotification) {
      onNotification(notification);
    }
  }, [onNotification]);

  useEffect(() => {
    console.log('[DEBUG] useNotificationsSocket: Initializing socket connection');
    console.log('[DEBUG] useNotificationsSocket: API URL:', import.meta.env.VITE_API_URL);

    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    console.log('[DEBUG] useNotificationsSocket: Token available:', !!token);

    const socket: Socket = io(`${import.meta.env.VITE_API_URL}/notifications`, {
      withCredentials: true,
      auth: {
        token: token
      },
      query: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('[DEBUG] useNotificationsSocket: Socket connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('[DEBUG] useNotificationsSocket: Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[DEBUG] useNotificationsSocket: Socket disconnected:', reason);
    });

    socket.on('newNotification', handleNotification);

    return () => {
      console.log('[DEBUG] useNotificationsSocket: Cleaning up socket connection');
      socket.disconnect();
    };
  }, [handleNotification]);
};