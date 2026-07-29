import { create } from 'zustand';
import { api } from '../services/api';

interface EmergencyState {
  incidentId: string | null;
  emergencyStatus: 'inactive' | 'active' | 'en_route' | 'resolved' | 'abuse_flagged';
  isLoading: boolean;

  isActive: boolean;

  triggerEmergency: (lat: number, lng: number, phone: string) => Promise<boolean>;
  resolveEmergency: (incidentId: string) => Promise<boolean>;
  flagAbuse: (incidentId: string, reason: string) => Promise<boolean>;
  reset: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  incidentId: null,
  emergencyStatus: 'inactive',
  isLoading: false,

  get isActive() {
    const s = get().emergencyStatus;
    return s === 'active' || s === 'en_route';
  },

  triggerEmergency: async (lat, lng, phone) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/emergency/trigger', { lat, lng, phone });
      if (res.error) {
        set({ isLoading: false });
        return false;
      }
      set({
        incidentId: `emerg-${Date.now()}`,
        emergencyStatus: 'active',
        isLoading: false,
      });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  resolveEmergency: async (incidentId) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/emergency/resolve', { incidentId });
      if (res.error) {
        set({ isLoading: false });
        return false;
      }
      set({ emergencyStatus: 'resolved', isLoading: false });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  flagAbuse: async (incidentId, reason) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/emergency/flag-abuse', { incidentId, reason });
      if (res.error) {
        set({ isLoading: false });
        return false;
      }
      set({ emergencyStatus: 'abuse_flagged', isLoading: false });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  reset: () => set({
    incidentId: null,
    emergencyStatus: 'inactive',
    isLoading: false,
  }),
}));
