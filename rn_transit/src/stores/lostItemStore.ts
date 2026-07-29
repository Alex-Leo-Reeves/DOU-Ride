import { create } from 'zustand';
import { api } from '../services/api';

interface LostItemState {
  myItems: Record<string, any>[];
  driverItems: Record<string, any>[];
  isLoading: boolean;
  error: string | null;

  reportLostItem: (data: { tripId: string; description: string; category?: string }, userId: string, token?: string | null) => Promise<boolean>;
  fetchMyItems: (token?: string | null) => Promise<void>;
  fetchDriverItems: (token?: string | null) => Promise<void>;
  returnItem: (itemId: string, token?: string | null) => Promise<boolean>;
  adminTriggerLostItem: (data: { studentMatric: string; description: string; category?: string }, token?: string | null) => Promise<boolean>;
  clearError: () => void;
}

export const useLostItemStore = create<LostItemState>((set) => ({
  myItems: [],
  driverItems: [],
  isLoading: false,
  error: null,

  reportLostItem: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/lost/report', { ...data, userId }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  fetchMyItems: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/lost/my-items', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, myItems: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchDriverItems: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/lost/driver-items', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, driverItems: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  returnItem: async (itemId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/lost/return/${itemId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set((state) => ({ isLoading: false, driverItems: state.driverItems.filter((i) => i.id !== itemId) }));
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  adminTriggerLostItem: async (data, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/lost/admin-trigger', data, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  clearError: () => set({ error: null }),
}));
