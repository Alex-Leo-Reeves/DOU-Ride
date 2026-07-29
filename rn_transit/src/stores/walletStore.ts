import { create } from 'zustand';
import { api } from '../services/api';
import type { Transaction } from '../types';

interface WalletState {
  balance: number;
  pendingBalance: number;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBalance: (userId: string, token?: string | null) => Promise<void>;
  deposit: (amount: number, userId: string, token?: string | null) => Promise<string | null>;
  withdraw: (data: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    amount: number;
  }, userId: string, token?: string | null) => Promise<boolean>;
  transfer: (data: {
    recipientId: string;
    recipientName?: string;
    amount: number;
    note?: string;
  }, userId: string, token?: string | null) => Promise<boolean>;
  clearError: () => void;
  formattedBalance: () => string;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  pendingBalance: 0,
  transactions: [],
  isLoading: false,
  error: null,

  fetchBalance: async (userId, token) => {
    if (!userId) {
      set({ error: 'User not authenticated' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/wallet/balance/${userId}`, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return;
      }
      set({
        isLoading: false,
        balance: (res.balance as number) ?? 0,
        pendingBalance: (res.pendingBalance as number) ?? 0,
        transactions: (res.transactions as Transaction[]) ?? [],
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  deposit: async (amount, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/wallet/deposit', { userId, amount }, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return null;
      }
      set({ isLoading: false });
      return (res.paymentUrl as string) || (res.payment_url as string) || null;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return null;
    }
  },

  withdraw: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/wallet/withdraw', { ...data, userId }, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      await get().fetchBalance(userId, token);
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  transfer: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/wallet/transfer', { ...data, userId }, token);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      await get().fetchBalance(userId, token);
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  formattedBalance: () => `₦${get().balance.toFixed(2)}`,
}));
