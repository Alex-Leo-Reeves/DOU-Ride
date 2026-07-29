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
  _backendUnreachable?: boolean;
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

    const url = `${API.baseUrl}${endpoint}`;
    const response = await fetch(url, options);
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
    // Differentiate between no internet and backend unreachable
    const msg = e.message || '';
    if (msg.includes('Network request failed') || msg.includes('fetch')) {
      return {
        error: 'Cannot reach server',
        details: `Backend at ${API.baseUrl} is not responding. Check your connection or try again later.`,
        _backendUnreachable: true,
      };
    }
    return { error: msg || 'Unknown error', _backendUnreachable: true };
  }
}

/** Check if the backend is reachable. Returns null on success or an error string. */
export async function checkBackendReachable(): Promise<string | null> {
  try {
    const res = await fetch(`${API.baseUrl}/api/health`, { method: 'GET' });
    if (res.ok) return null;
    return `Backend responded with status ${res.status}`;
  } catch (e: any) {
    return `Cannot reach backend at ${API.baseUrl} — ${e.message || 'network error'}`;
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
