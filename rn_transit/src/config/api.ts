/**
 * API and backend configuration for the React Native app.
 *
 * baseUrl logic:
 *   - Override via EXPO_PUBLIC_API_URL env var.
 *   - Otherwise, detect whether we're on a real device or emulator.
 *   - On a real device (production build or web), use the Render URL.
 *   - On emulator (__DEV__ is true in RN), try 10.0.2.2 as fallback.
 *
 * Run with: EXPO_PUBLIC_API_URL=https://dou-transit-api.onrender.com npx expo start
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function getBaseUrl(): string {
  // 1. Environment variable takes highest priority
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // 2. In dev mode, try Render first (the user is on a real device)
  //    Fall back to emulator localhost only if we're sure it's an emulator.
  if (isDev) {
    // On a physical device, 10.0.2.2 won't work — use Render by default
    return 'https://dou-transit-api.onrender.com';
  }

  // 3. Production / web build
  return 'https://dou-transit-api.onrender.com';
}

export const API = {
  baseUrl: getBaseUrl(),

  /** Render URL for fallback diagnostics. */
  renderUrl: 'https://dou-transit-api.onrender.com',

  supabaseUrl: 'https://uawbhgrxmvwrhncpophm.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTU2NTYsImV4cCI6MjA5OTQ3MTY1Nn0.FVeao1ms3_N2aUhGSiiEIk7sYY8pZLWCWj5dDItYXcQ',

  osrmUrl: 'https://dockerfile-dwb2.onrender.com',

  /** DOU Portal URL for student verification */
  douPortalUrl: 'https://myportal.dou.edu.ng/',

  campusCenterLat: 6.25,
  campusCenterLng: 6.70,
  defaultZoom: 15,

  insideCampusFare: 100,
  goingInsideFare: 300,
  goingOutsideFare: 200,
  dropFare: 1500,
  noShowPenalty: 50,
  abuseFine: 5000,
  platformFee: 10,
  minDeposit: 100,

  queueCallTimeoutSeconds: 120,
  locationUpdateIntervalMs: 5000,
} as const;
