/**
 * Centralized API service for all backend calls.
 * Mirrors Flutter's ApiService.
 */
import { API } from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiResponse {
  data?: unknown;
  error?: string;
  details?: string;
  [key: string]: unknown;
}

async function request(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: Record<string, unknown>,
  token?: string | null,
): Promise<ApiResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${API.baseUrl}${endpoint}`, options);
    const text = await response.text();
    const decoded = text ? JSON.parse(text) : {};

    if (response.ok) {
      if (Array.isArray(decoded)) {
        return { data: decoded };
      }
      return decoded;
    }

    return {
      error: decoded.error || 'Request failed',
      details: decoded.details || `Status ${response.status}`,
    };
  } catch (e: any) {
    if (e.message?.includes('Network request failed')) {
      return { error: 'No internet connection' };
    }
    return { error: e.message || 'Unknown error' };
  }
}

export const api = {
  get: (endpoint: string, token?: string | null) =>
    request(endpoint, 'GET', undefined, token),

  post: (endpoint: string, body?: Record<string, unknown>, token?: string | null) =>
    request(endpoint, 'POST', body, token),

  put: (endpoint: string, body?: Record<string, unknown>, token?: string | null) =>
    request(endpoint, 'PUT', body, token),

  del: (endpoint: string, token?: string | null) =>
    request(endpoint, 'DELETE', undefined, token),
};
