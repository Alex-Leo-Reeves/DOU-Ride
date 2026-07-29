import { create } from 'zustand';
import { api } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  fcmRegistered: boolean;

  // Computed getters
  isLoggedIn: boolean;
  role: UserRole | null;
  userId: string | null;
  token: string | null;

  // Actions
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  registerStudent: (data: Record<string, unknown>) => Promise<boolean>;
  registerDriver: (data: Record<string, unknown>) => Promise<boolean>;
  developerAccess: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setSuspended: (suspended: boolean, reason?: string) => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  fcmRegistered: false,

  get isLoggedIn() { return get().user !== null; },
  get role() { return get().user?.role ?? null; },
  get userId() { return get().user?.userId ?? null; },
  get token() { return get().user?.token ?? null; },

  login: async (emailOrPhone, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/auth/login', { emailOrPhone, password });
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      const user: User = {
        userId: res.userId as string,
        token: res.token as string,
        role: res.role as UserRole,
        fullName: res.fullName as string,
        needsOnboarding: (res.needsOnboarding as boolean) ?? false,
      };
      set({ user, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  registerStudent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/auth/register/student', data);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      const user: User = {
        userId: res.userId as string,
        token: res.token as string,
        role: 'student',
        fullName: res.fullName as string,
      };
      set({ user, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  registerDriver: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/auth/register/driver', data);
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      const user: User = {
        userId: res.userId as string,
        token: res.token as string,
        role: 'driver',
        fullName: res.fullName as string,
      };
      set({ user, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  developerAccess: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      // The backend developer-access endpoint checks the hardcoded passcode DOU_DEV_2026
      const res = await api.post('/api/auth/developer-access', {
        username,
        passcode: password,
      });
      if (res.error) {
        set({ isLoading: false, error: res.error as string });
        return false;
      }
      const user: User = {
        userId: res.userId as string,
        token: res.token as string,
        role: 'developer',
        fullName: res.fullName as string,
      };
      set({ user, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  logout: () => set({ user: null, error: null }),

  setSuspended: (suspended, reason) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, isSuspended: suspended, suspensionReason: reason } });
    }
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));
