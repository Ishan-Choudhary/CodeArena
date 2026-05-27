// src/utils/api.js

import { useAuthStore } from '../store/authStore';

/**
 * Custom fetch wrapper that includes credentials for cookie-based JWT auth.
 */
export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(url, { 
    ...options, 
    headers,
    credentials: 'include' // crucial for sending cookies
  });

  // If unauthorized, attempt to refresh the token using cookie-based refresh endpoint
  if (response.status === 401) {
    try {
      const refreshResponse = await fetch('/api/auth/jwt/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (refreshResponse.ok) {
        // Retry original request
        response = await fetch(url, { 
          ...options, 
          headers,
          credentials: 'include' 
        });
      } else {
        // Refresh token is also invalid/expired. Must login again.
        useAuthStore.getState().logout();
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    } catch (error) {
      console.error('Failed to refresh token', error);
      useAuthStore.getState().logout();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  return response;
}
