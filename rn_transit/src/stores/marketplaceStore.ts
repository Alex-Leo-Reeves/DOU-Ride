import { create } from 'zustand';
import { api } from '../services/api';

interface MarketplaceState {
  vendors: Record<string, any>[];
  products: Record<string, any>[];
  myOrders: Record<string, any>[];
  vendorOrders: Record<string, any>[];
  driverDeliveries: Record<string, any>[];
  isLoading: boolean;
  error: string | null;

  fetchVendors: (token?: string | null) => Promise<void>;
  fetchProducts: (vendorId: string, token?: string | null) => Promise<void>;
  placeOrder: (data: { vendorId: string; items: Record<string, any>[]; notes?: string }, userId: string, token?: string | null) => Promise<any>;
  acceptOrder: (orderId: string, token?: string | null) => Promise<boolean>;
  markReady: (orderId: string, token?: string | null) => Promise<boolean>;
  deliverOrder: (orderId: string, pin: string, token?: string | null) => Promise<boolean>;
  fetchVendorOrders: (token?: string | null) => Promise<void>;
  fetchDriverDeliveries: (token?: string | null) => Promise<void>;
  clearError: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  vendors: [],
  products: [],
  myOrders: [],
  vendorOrders: [],
  driverDeliveries: [],
  isLoading: false,
  error: null,

  fetchVendors: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/marketplace/vendors', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, vendors: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchProducts: async (vendorId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/api/marketplace/products/${vendorId}`, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, products: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  placeOrder: async (data, userId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/marketplace/order', { ...data, userId }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return null; }
      set({ isLoading: false });
      return res;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return null; }
  },

  acceptOrder: async (orderId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/marketplace/accept-order', { orderId }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      await get().fetchVendorOrders(token);
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  markReady: async (orderId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/api/marketplace/ready/${orderId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      await get().fetchVendorOrders(token);
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  deliverOrder: async (orderId, pin, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/marketplace/deliver', { orderId, packagePin: pin }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      await get().fetchDriverDeliveries(token);
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  fetchVendorOrders: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/marketplace/vendor-orders', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, vendorOrders: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  fetchDriverDeliveries: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/api/marketplace/driver-deliveries', token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return; }
      set({ isLoading: false, driverDeliveries: (res.data as Record<string, any>[]) ?? [] });
    } catch (e: any) { set({ isLoading: false, error: e.message }); }
  },

  clearError: () => set({ error: null }),
}));
