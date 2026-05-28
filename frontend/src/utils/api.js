// src/utils/api.js

import { useAuthStore } from '../store/authStore';

export function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Custom fetch wrapper that includes credentials for cookie-based JWT auth.
 */
export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken'),
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
      const refreshResponse = await fetch('/api/jwt/refresh/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
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

/**
 * Fetches the initial CSRF token from the backend.
 * Should be called once when the application initializes.
 */
export async function fetchCsrfToken() {
  try {
    // We don't use fetchWithAuth here to avoid infinite loops and we just need a plain fetch
    const response = await fetch('http://127.0.0.1:8000/api/csrf/', {
      method: 'GET',
      credentials: 'include'
    });
    if (!response.ok) {
      console.error('Failed to fetch CSRF token');
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
  }
}
