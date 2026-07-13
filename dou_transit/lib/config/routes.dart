/// Route name constants for the DOU Transit app.
class AppRoutes {
  static const String splash = '/';
  static const String roleSelection = '/auth/role-selection';
  static const String studentRegister = '/auth/register/student';
  static const String driverRegister = '/auth/register/driver';
  static const String login = '/auth/login';
  static const String developerLogin = '/auth/developer-login';
  static const String pwaInstall = '/auth/pwa-install';

  // Auth
  static const String portalVerification = '/auth/portal-verification';
  static const String staffLogin = '/auth/staff-login';
  static const String guardLogin = '/auth/guard-login';
  static const String rolePicker = '/auth/role-picker';

  // Student
  static const String studentHome = '/student/home';
  static const String studentWallet = '/student/wallet';
  static const String studentQueue = '/student/queue';
  static const String studentQueueCalled = '/student/queue-called';
  static const String studentPay = '/student/pay';
  static const String studentLostItem = '/student/lost-item';
  static const String studentLostItems = '/student/lost-items';
  static const String studentMarketplace = '/student/marketplace';
  static const String studentEmergency = '/student/emergency';

  // Driver
  static const String driverHome = '/driver/home';
  static const String driverWallet = '/driver/wallet';
  static const String driverPayLink = '/driver/pay-link';
  static const String driverLostItems = '/driver/lost-items';
  static const String driverEmergency = '/driver/emergency';
  static const String driverDelivery = '/driver/delivery';

  // Security
  static const String securityLogin = '/security/login';
  static const String securityScanner = '/security/scanner';
  static const String securityResult = '/security/result';

  // Admin
  static const String adminLogin = '/admin/login';
  static const String adminDashboard = '/admin/dashboard';
  static const String adminDrivers = '/admin/drivers';
  static const String adminStudents = '/admin/students';
  static const String adminReports = '/admin/reports';
  static const String adminLostItems = '/admin/lost-items';
  static const String adminLostItemTrigger = '/admin/lost-item-trigger';
  static const String adminEmergencies = '/admin/emergencies';
  static const String adminWallet = '/admin/wallet';

  // Vendor
  static const String vendorHome = '/vendor/home';
  static const String vendorOrders = '/vendor/orders';

  // Developer
  static const String developerMapping = '/developer/mapping';
  static const String developerLandmarks = '/developer/landmarks';

  // Shared
  static const String multiStopRoute = '/shared/multi-stop-route';
  static const String locationSharing = '/shared/location-sharing';
  static const String offlineSettings = '/shared/offline-settings';
}
