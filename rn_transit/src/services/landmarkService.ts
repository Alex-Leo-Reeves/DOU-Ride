/**
 * Landmark API service.
 */
import { API } from '../config/api';

export interface Landmark {
  id?: string;
  displayName: string;
  latitude: number;
  longitude: number;
  landmarkType: string;
  isActive?: boolean;
}

async function request(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  token?: string | null,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const url = `${API.baseUrl}${endpoint}`;
  const response = await fetch(url, options);
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export const landmarkService = {
  /** Fetch all active landmarks, optionally filtered by type. */
  list: async (type?: string): Promise<Landmark[]> => {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await request(`/api/landmarks${params}`, 'GET');
    return Array.isArray(res) ? res : [];
  },

  /** Add a new landmark. Requires X-User-Id. */
  add: async (landmark: Landmark, userId: string, token?: string | null): Promise<{ id?: string; error?: string }> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API.baseUrl}/api/landmarks/add`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        displayName: landmark.displayName,
        latitude: landmark.latitude,
        longitude: landmark.longitude,
        landmarkType: landmark.landmarkType,
      }),
    });
    const data = await response.json();
    if (!response.ok) return { error: data.error || 'Failed to add landmark' };
    return { id: data.id };
  },

  /** Soft-delete a landmark. */
  delete: async (id: string, token?: string | null): Promise<{ error?: string }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API.baseUrl}/api/landmarks/delete/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || 'Failed to delete landmark' };
    }
    return {};
  },
};
