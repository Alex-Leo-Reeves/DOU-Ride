/** Route name constants. Mirrors Flutter's AppRoutes. */
export const Routes = {
  // Auth
  roleSelection: 'RoleSelection',
  studentRegister: 'StudentRegister',
  driverRegister: 'DriverRegister',
  login: 'Login',
  driverLogin: 'DriverLogin',
  developerLogin: 'DeveloperLogin',
  pwaInstall: 'PwaInstall',
  portalVerification: 'PortalVerification',
  rolePicker: 'RolePicker',
  staffLogin: 'StaffLogin',
  guardLogin: 'GuardLogin',

  // Student
  studentHome: 'StudentHome',
  studentWallet: 'StudentWallet',
  studentQueue: 'StudentQueue',
  studentQueueCalled: 'StudentQueueCalled',
  studentPay: 'StudentPay',
  studentLostItem: 'StudentLostItem',
  studentLostItems: 'StudentLostItems',
  studentMarketplace: 'StudentMarketplace',
  studentEmergency: 'StudentEmergency',

  // Driver
  driverHome: 'DriverHome',
  driverWallet: 'DriverWallet',
  driverPayLink: 'DriverPayLink',
  driverLostItems: 'DriverLostItems',
  driverEmergency: 'DriverEmergency',
  driverDelivery: 'DriverDelivery',

  // Security
  securityLogin: 'SecurityLogin',
  securityScanner: 'SecurityScanner',
  securityResult: 'SecurityResult',

  // Admin
  adminDashboard: 'AdminDashboard',
  adminDrivers: 'AdminDrivers',
  adminStudents: 'AdminStudents',
  adminReports: 'AdminReports',
  adminLostItems: 'AdminLostItems',
  adminLostItemTrigger: 'AdminLostItemTrigger',
  adminEmergencies: 'AdminEmergencies',
  adminWallet: 'AdminWallet',

  // Vendor
  vendorOrders: 'VendorOrders',

  // Developer
  developerMapping: 'DeveloperMapping',

  // Shared
  multiStopRoute: 'MultiStopRoute',
  locationSharing: 'LocationSharing',
  offlineSettings: 'OfflineSettings',
  settings: 'Settings',

  // Tab Navigators
  studentTabs: 'StudentTabs',
  driverTabs: 'DriverTabs',
  adminTabs: 'AdminTabs',
} as const;
