// API utilities for frontend pages
window.API_URL = window.location.origin + '/api';

window.parseApiResponse = async function(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  const errorText = text ? text.trim() : `Unexpected server response (${response.status})`;
  throw new Error(errorText);
};

window.verifyToken = async function() {
  try {
    const response = await fetch(`${window.API_URL}/auth/verify`, {
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const result = await window.parseApiResponse(response);
    if (result?.valid && result.user) {
      if (result.user.role) {
        localStorage.setItem('userRole', result.user.role);
      }
      if (result.user.name) {
        localStorage.setItem('userName', result.user.name);
      }
      if (result.user.id) {
        localStorage.setItem('userId', result.user.id);
      }
      return result.user;
    }
  } catch (error) {
    console.warn('Token verification failed:', error);
  }

  return null;
};

/**
 * Helper for authenticated fetch requests.
 * All requests use credentials: 'include' for httpOnly cookie auth.
 * No localStorage token or Authorization header needed.
 */
window.authFetch = function(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include'
  });
};
