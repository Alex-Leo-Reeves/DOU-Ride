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
  deposit: (amount: number, userId: string, token?: string | null) => Promise<{ paymentUrl: string; transactionRef: string } | null>;
  verifyDeposit: (txRef: string, userId: string, token?: string | null) => Promise<{ verified: boolean; netAmount?: number; message?: string }>;
  cancelDeposit: (txRef: string, userId: string, token?: string | null) => Promise<boolean>;
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
      const paymentUrl = (res.paymentUrl as string) || (res.payment_url as string) || '';
      const transactionRef = (res.transactionRef as string) || (res.transaction_ref as string) || '';
      return { paymentUrl, transactionRef };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return null;
    }
  },

  verifyDeposit: async (txRef, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/wallet/verify-deposit/${txRef}`, token);
      if (res.verified) {
        await get().fetchBalance(userId, token);
        set({ isLoading: false });
        return { verified: true, netAmount: res.netAmount as number, message: res.message as string };
      }
      set({ isLoading: false });
      return { verified: false, message: (res.message as string) || 'Deposit pending settlement' };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return { verified: false, message: e.message };
    }
  },

  cancelDeposit: async (txRef, userId, token) => {
    try {
      const res = await api.post('/api/wallet/deposit/cancel', { transactionRef: txRef, userId }, token);
      if (res.error) {
        console.warn('[WALLET] Cancel deposit failed:', res.error);
        return false;
      }
      await get().fetchBalance(userId, token);
      return true;
    } catch (e: any) {
      console.warn('[WALLET] Cancel deposit error:', e.message);
      return false;
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
