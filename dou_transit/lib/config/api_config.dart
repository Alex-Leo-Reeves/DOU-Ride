/// API and backend configuration for the Flutter app.
class ApiConfig {
  /// The backend API base URL.
  /// In development, this could be localhost; in production, the Render URL.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080', // Android emulator -> host
  );

  /// Supabase project URL.
  static const String supabaseUrl =
      'https://uawbhgrxmvwrhncpophm.supabase.co';

  /// Supabase anon key.
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTU2NTYsImV4cCI6MjA5OTQ3MTY1Nn0.FVeao1ms3_N2aUhGSiiEIk7sYY8pZLWCWj5dDItYXcQ';

  /// OSRM routing server URL (Render).
  static const String osrmUrl =
      'https://dockerfile-dwb2.onrender.com';

  /// Campus center coordinates.
  static const double campusCenterLat = 6.25;
  static const double campusCenterLng = 6.70;
  static const double defaultZoom = 15.0;

  /// Pricing
  static const double insideCampusFare = 100.0;
  static const double goingInsideFare = 300.0;
  static const double goingOutsideFare = 200.0;
  static const double dropFare = 1500.0;
  static const double noShowPenalty = 50.0;
  static const double abuseFine = 5000.0;
  static const double platformFee = 10.0;
  static const double minDeposit = 100.0;

  /// Timeouts
  static const int queueCallTimeoutSeconds = 120;
  static const int locationUpdateIntervalMs = 5000;
}
