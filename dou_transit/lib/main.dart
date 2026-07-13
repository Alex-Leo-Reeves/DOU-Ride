import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/auth_provider.dart';
import 'package:dou_transit/providers/wallet_provider.dart';
import 'package:dou_transit/providers/ride_provider.dart';
import 'package:dou_transit/providers/queue_provider.dart';
import 'package:dou_transit/providers/location_provider.dart';
import 'package:dou_transit/providers/emergency_provider.dart';
import 'package:dou_transit/providers/notification_provider.dart';
import 'package:dou_transit/providers/admin_provider.dart';
import 'package:dou_transit/providers/lost_item_provider.dart';
import 'package:dou_transit/providers/marketplace_provider.dart';
import 'package:dou_transit/services/fcm_service.dart';
import 'package:dou_transit/services/offline_service.dart';
import 'package:dou_transit/services/offline_state.dart';
import 'package:dou_transit/screens/auth/role_selection_screen.dart';
import 'package:dou_transit/screens/auth/student_registration_screen.dart';
import 'package:dou_transit/screens/auth/driver_registration_screen.dart';
import 'package:dou_transit/screens/auth/login_screen.dart';
import 'package:dou_transit/screens/auth/developer_login_screen.dart';
import 'package:dou_transit/screens/auth/pwa_install_screen.dart';
import 'package:dou_transit/screens/auth/portal_verification_screen.dart';
import 'package:dou_transit/screens/auth/security_login_screen.dart';
import 'package:dou_transit/screens/auth/admin_login_screen.dart';
import 'package:dou_transit/screens/auth/role_picker_screen.dart';
import 'package:dou_transit/screens/shared/location_sharing_screen.dart';
import 'package:dou_transit/screens/shared/multi_stop_route_screen.dart';
import 'package:dou_transit/screens/shared/offline_screen.dart';
import 'package:dou_transit/screens/student/wallet_screen.dart';
import 'package:dou_transit/screens/student/student_home_screen.dart';
import 'package:dou_transit/screens/student/virtual_queue_screen.dart';
import 'package:dou_transit/screens/student/pay_screen.dart';
import 'package:dou_transit/screens/driver/pay_link_screen.dart';
import 'package:dou_transit/screens/security/guard_scanner_screen.dart';
import 'package:dou_transit/screens/security/scan_result_screen.dart';
import 'package:dou_transit/screens/security/search_student_screen.dart';
import 'package:dou_transit/screens/admin/admin_dashboard_screen.dart';
import 'package:dou_transit/screens/admin/student_directory_screen.dart';
import 'package:dou_transit/screens/admin/driver_directory_screen.dart';
import 'package:dou_transit/screens/admin/incident_log_screen.dart';
import 'package:dou_transit/screens/admin/emergency_map_screen.dart';
import 'package:dou_transit/screens/admin/lost_item_management_screen.dart';
import 'package:dou_transit/screens/admin/wallet_adjustment_screen.dart';
import 'package:dou_transit/screens/admin/admin_trigger_lost_screen.dart';
import 'package:dou_transit/screens/student/student_lost_item_screen.dart';
import 'package:dou_transit/screens/student/student_lost_items_screen.dart';
import 'package:dou_transit/screens/driver/driver_lost_items_screen.dart';
import 'package:dou_transit/screens/driver/driver_delivery_screen.dart';
import 'package:dou_transit/screens/vendor/vendor_order_feed_screen.dart';
import 'package:dou_transit/screens/student/student_marketplace_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await FcmService.initialize();
  await OfflineService.initialize();
  runApp(const DouTransitApp());
}

class DouTransitApp extends StatelessWidget {
  const DouTransitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        // Offline network state provider
        ChangeNotifierProvider(create: (_) => OfflineState()),
        ChangeNotifierProxyProvider<AuthProvider, WalletProvider>(
          create: (ctx) => WalletProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => WalletProvider(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, RideProvider>(
          create: (ctx) => RideProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => RideProvider(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, QueueProvider>(
          create: (ctx) => QueueProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => QueueProvider(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, AdminProvider>(
          create: (ctx) => AdminProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => AdminProvider(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, LostItemProvider>(
          create: (ctx) => LostItemProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => LostItemProvider(auth),
        ),
        ChangeNotifierProxyProvider<AuthProvider, MarketplaceProvider>(
          create: (ctx) => MarketplaceProvider(ctx.read<AuthProvider>()),
          update: (ctx, auth, _) => MarketplaceProvider(auth),
        ),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => EmergencyProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp(
        title: 'DOU Transit',
        debugShowCheckedModeBanner: false,
        theme: DouTheme.theme,
        initialRoute: AppRoutes.roleSelection,
        onGenerateRoute: (settings) {
          Widget page;
          switch (settings.name) {
            case AppRoutes.roleSelection:
              page = const RoleSelectionScreen();
              break;
            case AppRoutes.studentRegister:
              page = const StudentRegistrationScreen();
              break;
            case AppRoutes.driverRegister:
              page = const DriverRegistrationScreen();
              break;
            case AppRoutes.login:
              page = const LoginScreen();
              break;
            case AppRoutes.developerLogin:
              page = const DeveloperLoginScreen();
              break;
            case AppRoutes.pwaInstall:
              page = const PwaInstallScreen();
              break;
            case AppRoutes.portalVerification:
              page = const PortalVerificationScreen();
              break;
            case AppRoutes.rolePicker:
              page = const RolePickerScreen();
              break;
            case AppRoutes.staffLogin:
              page = const AdminLoginScreen();
              break;
            case AppRoutes.guardLogin:
              page = const SecurityLoginScreen();
              break;
            case AppRoutes.locationSharing:
              page = const LocationSharingScreen();
              break;
            case AppRoutes.multiStopRoute:
              page = const MultiStopRouteScreen();
              break;
            case AppRoutes.studentWallet:
              page = const WalletScreen();
              break;
            case AppRoutes.studentHome:
              page = const StudentHomeScreen();
              break;
            case AppRoutes.studentQueue:
              page = const VirtualQueueScreen();
              break;
            case AppRoutes.studentQueueCalled:
              page = const QueueCalledScreen();
              break;
            case AppRoutes.studentPay:
              page = const StudentPayScreen();
              break;
            case AppRoutes.driverPayLink:
              page = const DriverPayLinkScreen();
              break;
            case AppRoutes.securityScanner:
              page = const GuardScannerScreen();
              break;
            case AppRoutes.securityResult:
              page = const ScanResultScreen();
              break;
            // Offline resilience screen
            case AppRoutes.offlineSettings:
              page = const OfflineResilienceScreen();
              break;
            // Lost & Found screens
            case AppRoutes.studentLostItem:
              page = const StudentLostItemReportScreen();
              break;
            case AppRoutes.studentLostItems:
              page = const StudentLostItemsScreen();
              break;
            case AppRoutes.driverLostItems:
              page = const DriverLostItemsScreen();
              break;
            case AppRoutes.adminLostItemTrigger:
              page = const AdminTriggerLostItemScreen();
              break;
            case AppRoutes.studentMarketplace:
              page = const StudentMarketplaceScreen();
              break;
            case AppRoutes.vendorOrders:
              page = const VendorOrderFeedScreen();
              break;
            case AppRoutes.driverDelivery:
              page = const DriverDeliveryScreen();
              break;

            // Admin screens
            case AppRoutes.adminDashboard:
              page = const AdminDashboardScreen();
              break;
            case AppRoutes.adminStudents:
              page = const StudentDirectoryScreen();
              break;
            case AppRoutes.adminDrivers:
              page = const DriverDirectoryScreen();
              break;
            case AppRoutes.adminReports:
              page = const IncidentLogScreen();
              break;
            case AppRoutes.adminEmergencies:
              page = const EmergencyMapScreen();
              break;
            case AppRoutes.adminLostItems:
              page = const LostItemManagementScreen();
              break;
            case AppRoutes.adminWallet:
              page = const WalletAdjustmentScreen();
              break;
            default:
              page = const RoleSelectionScreen();
          }
          return MaterialPageRoute(
            builder: (_) => page,
            settings: settings,
          );
        },
      ),
    );
  }
}
