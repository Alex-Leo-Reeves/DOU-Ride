/** API and backend configuration. Mirrors Flutter's ApiConfig. */
export const API = {
  baseUrl: __DEV__
    ? 'http://10.0.2.2:8080' // Android emulator -> host
    : 'https://dou-transit.onrender.com',

  supabaseUrl: 'https://uawbhgrxmvwrhncpophm.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTU2NTYsImV4cCI6MjA5OTQ3MTY1Nn0.FVeao1ms3_N2aUhGSiiEIk7sYY8pZLWCWj5dDItYXcQ',

  osrmUrl: 'https://dockerfile-dwb2.onrender.com',

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
