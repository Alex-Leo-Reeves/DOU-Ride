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
  updateDriverLocation: (lat: number, lng: number) => Promise<void>;
  fetchDriverLocations: () => Promise<void>;
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

  updateDriverLocation: async (lat, lng) => {
    set({ currentLat: lat, currentLng: lng });
    // await api.post('/api/driver/location', { lat, lng });
  },

  fetchDriverLocations: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/api/driver/location');
      if (res.data) {
        set({ driverLocations: res.data as DriverLocation[] });
      }
    } catch {
      // silently fail
    } finally {
      set({ isLoading: false });
    }
  },
}));
