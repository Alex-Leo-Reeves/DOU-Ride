import { create } from 'zustand';
import * as Location from 'expo-location';
import { api } from '../services/api';

interface DriverLocation {
  id: string;
  lat: number;
  lng: number;
  fleetNumber?: number;
  driverName?: string;
}

interface LocationState {
  currentLat: number | null;
  currentLng: number | null;
  driverLocations: DriverLocation[];
  isLoading: boolean;
  isTracking: boolean;

  setCurrentLocation: (lat: number, lng: number) => void;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  updateDriverLocation: (lat: number, lng: number, token?: string | null) => Promise<void>;
  fetchDriverLocations: (token?: string | null) => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLat: null,
  currentLng: null,
  driverLocations: [],
  isLoading: false,
  isTracking: false,

  setCurrentLocation: (lat, lng) => set({ currentLat: lat, currentLng: lng }),

  startTracking: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    set({ isTracking: true });

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (pos) => {
        set({ currentLat: pos.coords.latitude, currentLng: pos.coords.longitude });
      }
    );

    return true;
  },

  stopTracking: () => set({ isTracking: false }),

  updateDriverLocation: async (lat, lng, token?: string | null) => {
    set({ currentLat: lat, currentLng: lng });
    // Backend expects { latitude, longitude } matching UpdateLocationRequest
    await api.post('/api/driver/update-location', { latitude: lat, longitude: lng }, token);
  },

  fetchDriverLocations: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/api/driver/location', token);
      // Backend returns array of DriverLocationResponse directly (not wrapped in {data})
      const data = res.data ?? (Array.isArray(res) ? res : undefined);
      if (Array.isArray(data)) {
        set({ driverLocations: data as DriverLocation[] });
      } else if (Array.isArray(res)) {
        set({ driverLocations: res as unknown as DriverLocation[] });
      }
    } catch {
      // silently fail
    } finally {
      set({ isLoading: false });
    }
  },
}));
