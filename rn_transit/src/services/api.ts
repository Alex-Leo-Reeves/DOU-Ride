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

let _cachedAuthStore: any = null;
function getActiveAuth(): { userId: string | null; token: string | null } {
  try {
    if (!_cachedAuthStore) {
      _cachedAuthStore = require('../stores/authStore').useAuthStore;
    }
    const user = _cachedAuthStore?.getState?.()?.user;
    return {
      userId: user?.userId || null,
      token: user?.token || null,
    };
  } catch {
    return { userId: null, token: null };
  }
}

async function request(
  endpoint: string,
  method: HttpMethod = 'GET',
  body?: Record<string, unknown>,
  token?: string | null,
  retryCount: number = 0,
): Promise<ApiResponse> {
  try {
    const auth = getActiveAuth();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const effectiveToken = token || auth.token;
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }

    const effectiveUserId = auth.userId;
    if (effectiveUserId) {
      headers['X-User-Id'] = effectiveUserId;
    }

    const controller = new AbortController();
    // 60s timeout for Render free tier cold starts
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    };

    const url = `${API.baseUrl}${endpoint}`;
    let response: Response;
    try {
      response = await fetch(url, options);
    } finally {
      clearTimeout(timeoutId);
    }
    
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
    // Transparent 1-time retry on Render cold-start / network wake-up
    if (retryCount < 1 && (e.name === 'AbortError' || e.message?.includes('Network request failed'))) {
      await new Promise((res) => setTimeout(res, 2500));
      return request(endpoint, method, body, token, retryCount + 1);
    }

    const msg = e.message || '';
    if (msg.includes('Network request failed') || msg.includes('fetch') || e.name === 'AbortError') {
      return {
        error: e.name === 'AbortError' ? 'Request timed out' : 'Cannot reach server',
        details: e.name === 'AbortError' 
          ? 'The server took too long to respond. Render is waking up — please try again.'
          : `Backend at ${API.baseUrl} is not responding. Check your connection or wait for Render to wake up.`,
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
