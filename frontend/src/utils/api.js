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


export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken'),
    ...options.headers,
  };

  let response = await fetch(url, { 
    ...options, 
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    
    const retryheaders = {
      ...headers,
      'X-CSRFToken': getCookie("csrftoken")
    }

    response = await fetch(url, {
      ...options,
      headers: retryheaders,
      credentials: "include"
    })

    if(response.status === 401) {
      useAuthStore.getState().logout();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  return response;
}

export async function fetchCsrfToken() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/csrf/`, {
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
