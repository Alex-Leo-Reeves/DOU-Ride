import { create } from 'zustand';
import { api } from '../services/api';
import type { AdminAnalytics, AdminDriver, AdminStudent } from '../types';

interface AdminState {
  analytics: AdminAnalytics | null;
  drivers: AdminDriver[];
  students: AdminStudent[];
  activeKekes: number;
  tripsToday: number;
  revenueToday: number;
  pendingBankApprovals: number;
  pendingReports: number;
  pendingLostItems: number;
  reports: Record<string, any>[];
  emergencies: Record<string, any>[];
  lostItems: Record<string, any>[];
  isLoading: boolean;
  error: string | null;

  fetchAnalytics: (token?: string | null) => Promise<void>;
  fetchDrivers: (token?: string | null) => Promise<void>;
  fetchStudents: (token?: string | null) => Promise<void>;
  fetchReports: (token?: string | null) => Promise<void>;
  fetchEmergencies: (token?: string | null) => Promise<void>;
  fetchLostItems: (token?: string | null) => Promise<void>;
  resolveReport: (id: string, token?: string | null) => Promise<boolean>;
  closeLostItem: (id: string, token?: string | null) => Promise<boolean>;
  adjustWallet: (userId: string, amount: number, reason: string, token?: string | null) => Promise<boolean>;
  formattedRevenue: string;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  analytics: null,
  drivers: [],
  students: [],
  reports: [],
  emergencies: [],
  lostItems: [],
  activeKekes: 0,
  tripsToday: 0,
  revenueToday: 0,
  pendingBankApprovals: 0,
  pendingReports: 0,
  pendingLostItems: 0,
  isLoading: false,
  error: null,

  fetchAnalytics: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/admin/analytics', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      // Backend returns AdminAnalyticsResponse with nested pendingActions
      const pending = (res.pendingActions as Record<string, unknown>) ?? {};
      set({
        isLoading: false,
        activeKekes: (res.activeKekes as number) ?? 0,
        tripsToday: (res.tripsToday as number) ?? 0,
        revenueToday: (res.platformRevenue as number) ?? 0,
        pendingBankApprovals: (res.pendingBankApprovals as number) ?? 0,
        pendingReports: (pending.incidentReports as number) ?? 0,
        pendingLostItems: (pending.lostItemClaims as number) ?? 0,
      });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchDrivers: async (token) => {
    try {
      const res = await api.get('/api/admin/drivers', token);
      if (res.error) { set({ error: res.error as string }); return; }
      set({ drivers: (res.data as AdminDriver[]) ?? [] });
    } catch (e: any) { set({ error: e.message }); }
  },

  fetchStudents: async (token) => {
    try {
      const res = await api.get('/api/admin/students', token);
      if (res.error) { set({ error: res.error as string }); return; }
      set({ students: (res.data as AdminStudent[]) ?? [] });
    } catch (e: any) { set({ error: e.message }); }
  },

  fetchReports: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/admin/reports', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, reports: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchEmergencies: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/admin/emergencies', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, emergencies: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchLostItems: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/admin/lost-items', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, lostItems: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  resolveReport: async (id, token) => {
    try {
      const res = await api.post(`/api/admin/reports/resolve/${id}`, {}, token);
      if (res.error) { set({ error: res.error as string }); return false; }
      await get().fetchReports(token);
      return true;
    } catch (e: any) { set({ error: e.message }); return false; }
  },

  closeLostItem: async (id, token) => {
    try {
      const res = await api.post(`/api/admin/lost-items/close/${id}`, {}, token);
      if (res.error) { set({ error: res.error as string }); return false; }
      await get().fetchLostItems(token);
      return true;
    } catch (e: any) { set({ error: e.message }); return false; }
  },

  adjustWallet: async (userId, amount, reason, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/admin/wallet/adjust', { userId, amount, reason }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  get formattedRevenue() { return `₦${get().revenueToday.toFixed(2)}`; },

  clearError: () => set({ error: null }),
}));
