import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, ActivityIndicator, Image, Text } from 'react-native';
import { Colors, FontSize } from './src/config/theme';

// Auth Screens
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';
import StudentRegisterScreen from './src/screens/auth/StudentRegisterScreen';
import DriverRegisterScreen from './src/screens/auth/DriverRegisterScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import DriverLoginScreen from './src/screens/auth/DriverLoginScreen';
import DeveloperLoginScreen from './src/screens/auth/DeveloperLoginScreen';
import RolePickerScreen from './src/screens/auth/RolePickerScreen';
import StaffLoginScreen from './src/screens/auth/StaffLoginScreen';
import GuardLoginScreen from './src/screens/auth/GuardLoginScreen';
import PortalVerificationScreen from './src/screens/auth/PortalVerificationScreen';
import PwaInstallScreen from './src/screens/auth/PwaInstallScreen';

// Tab Navigators
import StudentTabNavigator from './src/navigation/StudentTabNavigator';
import DriverTabNavigator from './src/navigation/DriverTabNavigator';
import AdminTabNavigator from './src/navigation/AdminTabNavigator';

// Student screens (stack screens)
import StudentHomeScreen from './src/screens/student/StudentHomeScreen';
import StudentWalletScreen from './src/screens/student/StudentWalletScreen';
import StudentQueueScreen from './src/screens/student/StudentQueueScreen';
import StudentQueueCalledScreen from './src/screens/student/StudentQueueCalledScreen';
import StudentPayScreen from './src/screens/student/StudentPayScreen';
import StudentLostItemScreen from './src/screens/student/StudentLostItemScreen';
import StudentLostItemsScreen from './src/screens/student/StudentLostItemsScreen';
import StudentMarketplaceScreen from './src/screens/student/StudentMarketplaceScreen';

// Driver screens
import DriverPayLinkScreen from './src/screens/driver/DriverPayLinkScreen';
import DriverLostItemsScreen from './src/screens/driver/DriverLostItemsScreen';
import DriverDeliveryScreen from './src/screens/driver/DriverDeliveryScreen';

// Security screens
import SecurityScannerScreen from './src/screens/security/SecurityScannerScreen';
import SecurityResultScreen from './src/screens/security/SecurityResultScreen';
import SearchStudentScreen from './src/screens/security/SearchStudentScreen';

// Admin screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import StudentDirectoryScreen from './src/screens/admin/StudentDirectoryScreen';
import DriverDirectoryScreen from './src/screens/admin/DriverDirectoryScreen';
import IncidentLogScreen from './src/screens/admin/IncidentLogScreen';
import EmergencyMapScreen from './src/screens/admin/EmergencyMapScreen';
import LostItemManagementScreen from './src/screens/admin/LostItemManagementScreen';
import WalletAdjustmentScreen from './src/screens/admin/WalletAdjustmentScreen';
import AdminTriggerLostItemScreen from './src/screens/admin/AdminTriggerLostItemScreen';

// Vendor screens
import VendorOrderFeed from './src/screens/vendor/VendorOrderFeed';

// Developer screens
import DeveloperMappingScreen from './src/screens/developer/DeveloperMappingScreen';

// Shared screens
import MultiStopRouteScreen from './src/screens/shared/MultiStopRouteScreen';
import LocationSharingScreen from './src/screens/shared/LocationSharingScreen';
import OfflineSettingsScreen from './src/screens/shared/OfflineSettingsScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';

import { Routes } from './src/config/routes';
import { useAuthStore } from './src/stores/authStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, isRestoringSession, loadPersistedSession } = useAuthStore();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    async function init() {
      await loadPersistedSession();
      setSessionReady(true);
    }
    init();
  }, []);

  if (!sessionReady || isRestoringSession) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/dou-logo.jpeg')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>DOU Transit</Text>
        <Text style={styles.splashSubtitle}>Connecting Campus Mobility</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Determine initial route based on persisted session
  let initialRoute: string = Routes.roleSelection;
  if (user) {
    switch (user.role) {
      case 'student':
        initialRoute = Routes.studentTabs;
        break;
      case 'driver':
        initialRoute = Routes.driverTabs;
        break;
      case 'admin':
        initialRoute = Routes.adminTabs;
        break;
      case 'security':
        initialRoute = Routes.securityScanner;
        break;
      case 'vendor':
        initialRoute = Routes.vendorOrders;
        break;
      case 'developer':
        initialRoute = Routes.developerMapping;
        break;
      default:
        initialRoute = Routes.studentTabs;
    }
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.white },
            animation: 'slide_from_right',
          }}
        >
          {/* Main Role Tab Navigators */}
          <Stack.Screen name={Routes.studentTabs} component={StudentTabNavigator} />
          <Stack.Screen name={Routes.driverTabs} component={DriverTabNavigator} />
          <Stack.Screen name={Routes.adminTabs} component={AdminTabNavigator} />

          {/* Auth Screens */}
          <Stack.Screen name={Routes.roleSelection} component={RoleSelectionScreen} />
          <Stack.Screen name={Routes.studentRegister} component={StudentRegisterScreen} />
          <Stack.Screen name={Routes.driverRegister} component={DriverRegisterScreen} />
          <Stack.Screen name={Routes.login} component={LoginScreen} />
          <Stack.Screen name={Routes.driverLogin} component={DriverLoginScreen} />
          <Stack.Screen name={Routes.developerLogin} component={DeveloperLoginScreen} />
          <Stack.Screen name={Routes.rolePicker} component={RolePickerScreen} />
          <Stack.Screen name={Routes.staffLogin} component={StaffLoginScreen} />
          <Stack.Screen name={Routes.guardLogin} component={GuardLoginScreen} />
          <Stack.Screen name={Routes.portalVerification} component={PortalVerificationScreen} />
          <Stack.Screen name={Routes.pwaInstall} component={PwaInstallScreen} />

          {/* Student Stack Screens */}
          <Stack.Screen name={Routes.studentHome} component={StudentHomeScreen} />
          <Stack.Screen name={Routes.studentWallet} component={StudentWalletScreen} />
          <Stack.Screen name={Routes.studentQueue} component={StudentQueueScreen} />
          <Stack.Screen name={Routes.studentQueueCalled} component={StudentQueueCalledScreen} />
          <Stack.Screen name={Routes.studentPay} component={StudentPayScreen} />
          <Stack.Screen name={Routes.studentLostItem} component={StudentLostItemScreen} />
          <Stack.Screen name={Routes.studentLostItems} component={StudentLostItemsScreen} />
          <Stack.Screen name={Routes.studentMarketplace} component={StudentMarketplaceScreen} />

          {/* Driver Stack Screens */}
          <Stack.Screen name={Routes.driverPayLink} component={DriverPayLinkScreen} />
          <Stack.Screen name={Routes.driverLostItems} component={DriverLostItemsScreen} />
          <Stack.Screen name={Routes.driverDelivery} component={DriverDeliveryScreen} />

          {/* Security Screens */}
          <Stack.Screen name={Routes.securityScanner} component={SecurityScannerScreen} />
          <Stack.Screen name={Routes.securityResult} component={SecurityResultScreen} />
          <Stack.Screen name="SearchStudent" component={SearchStudentScreen} />

          {/* Admin Stack Screens */}
          <Stack.Screen name={Routes.adminDashboard} component={AdminDashboardScreen} />
          <Stack.Screen name={Routes.adminStudents} component={StudentDirectoryScreen} />
          <Stack.Screen name={Routes.adminDrivers} component={DriverDirectoryScreen} />
          <Stack.Screen name={Routes.adminReports} component={IncidentLogScreen} />
          <Stack.Screen name={Routes.adminEmergencies} component={EmergencyMapScreen} />
          <Stack.Screen name={Routes.adminLostItems} component={LostItemManagementScreen} />
          <Stack.Screen name={Routes.adminWallet} component={WalletAdjustmentScreen} />
          <Stack.Screen name={Routes.adminLostItemTrigger} component={AdminTriggerLostItemScreen} />

          {/* Vendor */}
          <Stack.Screen name={Routes.vendorOrders} component={VendorOrderFeed} />

          {/* Developer */}
          <Stack.Screen name={Routes.developerMapping} component={DeveloperMappingScreen} />

          {/* Shared Screens */}
          <Stack.Screen name={Routes.settings} component={SettingsScreen} />
          <Stack.Screen name={Routes.multiStopRoute} component={MultiStopRouteScreen} />
          <Stack.Screen name={Routes.locationSharing} component={LocationSharingScreen} />
          <Stack.Screen name={Routes.offlineSettings} component={OfflineSettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashLogo: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: FontSize.xxl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  splashSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 4,
  },
});
