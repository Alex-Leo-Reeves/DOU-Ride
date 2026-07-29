import { create } from 'zustand';
import { api } from '../services/api';
import type { QueueEntry } from '../types';

interface QueueState {
  entries: QueueEntry[];
  isLoading: boolean;
  error: string | null;

  joinQueue: (data: {
    destinationId: string;
    seats?: number;
    destinationName?: string;
  }, userId: string, token?: string | null) => Promise<boolean>;
  fetchQueueStatus: (userId: string, token?: string | null) => Promise<void>;
  leaveQueue: (queueId: string, token?: string | null) => Promise<boolean>;
  clearError: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  entries: [],
  isLoading: false,
  error: null,

  joinQueue: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/queue/join', {
        destinationId: data.destinationId,
        userId,
        seats: data.seats ?? 1,
      }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  fetchQueueStatus: async (userId, token) => {
    try {
      const res = await api.get(`/api/queue/status/${userId}`, token);
      if (res.error) { set({ error: res.error as string }); return; }
      set({ entries: (res.entries as QueueEntry[]) ?? [] });
    } catch (e: any) { set({ error: e.message }); }
  },

  leaveQueue: async (queueId, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/api/queue/leave/${queueId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  clearError: () => set({ error: null }),
}));
