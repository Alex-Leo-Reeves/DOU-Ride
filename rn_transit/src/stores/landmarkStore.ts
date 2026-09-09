import { create } from 'zustand';
import { landmarkService, Landmark } from '../services/landmarkService';

interface LandmarkState {
  landmarks: Landmark[];
  isLoading: boolean;

  fetchLandmarks: () => Promise<void>;
  addLandmark: (
    displayName: string,
    latitude: number,
    longitude: number,
    landmarkType: string,
    userId: string,
    token?: string | null,
  ) => Promise<{ id?: string; error?: string }>;
  deleteLandmark: (id: string, token?: string | null) => Promise<{ error?: string }>;
}

export const useLandmarkStore = create<LandmarkState>((set, get) => ({
  landmarks: [],
  isLoading: false,

  fetchLandmarks: async () => {
    set({ isLoading: true });
    try {
      const landmarks = await landmarkService.list();
      set({ landmarks });
    } catch {
      // silently fail
    } finally {
      set({ isLoading: false });
    }
  },

  addLandmark: async (displayName, latitude, longitude, landmarkType, userId, token) => {
    const result = await landmarkService.add(
      { displayName, latitude, longitude, landmarkType },
      userId,
      token,
    );
    if (result.id) {
      // Refresh list from server
      get().fetchLandmarks();
    }
    return result;
  },

  deleteLandmark: async (id, token) => {
    const result = await landmarkService.delete(id, token);
    if (!result.error) {
      set((s) => ({
        landmarks: s.landmarks.filter((l) => l.id !== id),
      }));
    }
    return result;
  },
}));
