import { create } from 'zustand';
import { api } from '../services/api';
import type { TripStatus } from '../types';

interface RideState {
  currentTripId: string | null;
  tripStatus: TripStatus;
  boardingPin: string | null;
  isLoading: boolean;
  error: string | null;
  totalFare: number | null;
  driverName: string | null;
  driverFleetNumber: number | null;
  destinationName: string | null;
  passengers: Record<string, any>[];
  totalPaid: number;
  allPaid: boolean;

  requestRide: (data: {
    destinationId: string;
    seats: number;
    tripType: string;
    destinationName?: string;
  }, userId: string, token?: string | null) => Promise<any>;
  acceptRide: (tripId: string, token?: string | null) => Promise<boolean>;
  boardRide: (tripId: string, pin: string, token?: string | null) => Promise<boolean>;
  completeRide: (tripId: string, token?: string | null) => Promise<boolean>;
  reportNoShow: (tripId: string, pin: string, token?: string | null) => Promise<boolean>;
  generatePayLink: (tripId: string, token?: string | null, amount?: number) => Promise<any>;
  scanPayLink: (qrData: string, token?: string | null) => Promise<boolean>;
  fetchPassengers: (tripId: string, token?: string | null) => Promise<boolean>;
  clearRide: (tripId: string, token?: string | null) => Promise<boolean>;
  setDriverInfo: (info: { name?: string; fleetNumber?: number; fare?: number }) => void;
  setTripStatus: (status: TripStatus) => void;
  setCurrentTrip: (tripId: string, data?: { pin?: string; fare?: number; status?: TripStatus }) => void;
  reset: () => void;
  clearError: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  currentTripId: null,
  tripStatus: 'idle',
  boardingPin: null,
  isLoading: false,
  error: null,
  totalFare: null,
  driverName: null,
  driverFleetNumber: null,
  destinationName: null,
  passengers: [],
  totalPaid: 0,
  allPaid: false,

  requestRide: async (data, userId, token) => {
    set({ isLoading: true, error: null, destinationName: data.destinationName });
    try {
      const res = await api.post('/api/rides/request', {
        destinationId: data.destinationId,
        seatsRequested: data.seats,
        tripType: data.tripType,
      }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return null; }
      set({
        isLoading: false,
        currentTripId: (res.tripId as string) ?? null,
        boardingPin: (res.boardingPin as string) ?? null,
        tripStatus: (res.status as TripStatus) ?? 'requested',
        totalFare: (res.totalFare as number) ?? null,
      });
      return res;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return null; }
  },

  acceptRide: async (tripId, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/api/rides/accept/${tripId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ tripStatus: 'accepted', isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  boardRide: async (tripId, pin, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/rides/board', { tripId, boardingPin: pin }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ tripStatus: 'boarding', isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  completeRide: async (tripId, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/api/rides/complete/${tripId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ tripStatus: 'completed', isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  reportNoShow: async (tripId, pin, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/rides/no-show', { tripId, boardingPin: pin }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ tripStatus: 'no_show', isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  generatePayLink: async (tripId, token, amount) => {
    try {
      const res = await api.post('/api/rides/pay-link/generate', { tripId, amount }, token);
      if (res.error) { set({ error: res.error as string }); return null; }
      return res;
    } catch (e: any) { set({ error: e.message }); return null; }
  },

  scanPayLink: async (qrData, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/api/rides/pay-link/scan', { qrData }, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  fetchPassengers: async (tripId, token) => {
    try {
      const res = await api.get(`/api/rides/${tripId}/passengers`, token);
      if (res.error) { set({ error: res.error as string }); return false; }
      set({
        passengers: (res.passengers as Record<string, any>[]) ?? [],
        totalPaid: (res.totalPaid as number) ?? 0,
        allPaid: (res.allPaid as boolean) ?? false,
      });
      return true;
    } catch (e: any) { set({ error: e.message }); return false; }
  },

  clearRide: async (tripId, token) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/api/rides/clear/${tripId}`, {}, token);
      if (res.error) { set({ isLoading: false, error: res.error as string }); return false; }
      set({ tripStatus: 'completed', isLoading: false });
      return true;
    } catch (e: any) { set({ isLoading: false, error: e.message }); return false; }
  },

  setDriverInfo: (info) => {
    set({
      driverName: info.name,
      driverFleetNumber: info.fleetNumber,
      ...(info.fare ? { totalFare: info.fare } : {}),
    });
  },

  setTripStatus: (status) => set({ tripStatus: status }),

  setCurrentTrip: (tripId, data) => {
    set({
      currentTripId: tripId,
      ...(data?.pin ? { boardingPin: data.pin } : {}),
      ...(data?.fare ? { totalFare: data.fare } : {}),
      ...(data?.status ? { tripStatus: data.status } : {}),
    });
  },

  reset: () => set({
    currentTripId: null,
    tripStatus: 'idle',
    boardingPin: null,
    error: null,
    totalFare: null,
    driverName: null,
    driverFleetNumber: null,
    destinationName: null,
    passengers: [],
    totalPaid: 0,
    allPaid: false,
  }),

  clearError: () => set({ error: null }),
}));
