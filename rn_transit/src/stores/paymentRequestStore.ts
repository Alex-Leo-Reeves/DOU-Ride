import { create } from 'zustand';
import { api } from '../services/api';

export interface PaymentRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  payerId: string;
  payerName: string;
  amount: number;
  description: string;
  status: 'pending' | 'accepted' | 'denied' | 'cancelled';
  createdAt: string;
}

interface PaymentRequestState {
  incoming: PaymentRequest[];
  outgoing: PaymentRequest[];
  isLoading: boolean;
  error: string | null;

  createRequest: (data: {
    payerId: string;
    amount: number;
    description?: string;
    tripId?: string;
  }, userId: string, token?: string | null) => Promise<boolean>;
  fetchIncoming: (userId: string, token?: string | null) => Promise<void>;
  fetchOutgoing: (userId: string, token?: string | null) => Promise<void>;
  respondToRequest: (requestId: string, action: 'accept' | 'deny', token?: string | null) => Promise<boolean>;
  clearError: () => void;
}

export const usePaymentRequestStore = create<PaymentRequestState>((set) => ({
  incoming: [],
  outgoing: [],
  isLoading: false,
  error: null,

  createRequest: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/payment-requests/create', {
        payerId: data.payerId,
        amount: data.amount,
        description: data.description,
        tripId: data.tripId,
      }, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      set({ isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  fetchIncoming: async (userId, token) => {
    if (!userId) return;
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/payment-requests/incoming/${userId}`, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return;
      }
      const data = res.data ?? (Array.isArray(res) ? res : []);
      set({ isLoading: false, incoming: data as PaymentRequest[] });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  fetchOutgoing: async (userId, token) => {
    if (!userId) return;
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/payment-requests/outgoing/${userId}`, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return;
      }
      const data = res.data ?? (Array.isArray(res) ? res : []);
      set({ isLoading: false, outgoing: data as PaymentRequest[] });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  respondToRequest: async (requestId, action, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/payment-requests/${requestId}/respond`, { action }, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      // Remove from incoming
      set((state) => ({
        isLoading: false,
        incoming: state.incoming.filter((r) => r.id !== requestId),
      }));
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
