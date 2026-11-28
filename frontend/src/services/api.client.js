/**
 * API client for FazalDataConverter frontend (Chunk B).
 * Unified API client per TRD §11.2 using native Fetch API.
 * All requests go through this single instance.
 */

const API_BASE = '/api';

/**
 * Fetch with error handling and session support
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    credentials: 'include', // Send cookies (session)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }
    return await response.json();
  } catch (error) {
    throw new Error(
      error.message || 'Network error - could not reach server'
    );
  }
}

/**
 * GET request helper
 */
export const get = (endpoint, options = {}) => fetchApi(endpoint, { ...options, method: 'GET' });

/**
 * POST request helper
 */
export const post = (endpoint, data = {}, options = {}) => {
  return fetchApi(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * PUT request helper
 */
export const put = (endpoint, data = {}, options = {}) =>
  fetchApi(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined });

/**
 * DELETE request helper
 */
export const del = (endpoint, data = undefined, options = {}) =>
  fetchApi(endpoint, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });