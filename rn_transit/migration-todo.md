# DOU Transit — Flutter → React Native Migration

## Status: ✅ Complete

All screens, stores, services, types, navigation wiring, and UI components have been migrated from Flutter to React Native (Expo).

### Files Migrated

#### Project Structure
- [x] Expo + TypeScript project setup
- [x] Design system (theme.ts, api.ts, routes.ts)
- [x] Shared TypeScript types (types/index.ts)
- [x] API service (services/api.ts)

#### Zustand Stores (7 → 10)
- [x] authStore — AuthProvider
- [x] walletStore — WalletProvider
- [x] rideStore — RideProvider
- [x] queueStore — QueueProvider
- [x] adminStore — AdminProvider
- [x] lostItemStore — LostItemProvider
- [x] marketplaceStore — MarketplaceProvider
- [x] **emergencyStore** — EmergencyProvider *(NEW)*
- [x] **locationStore** — LocationProvider *(NEW)*
- [x] **notificationStore** — NotificationProvider *(NEW)*

#### Services (1 → 3)
- [x] api.ts — ApiService
- [x] **osrmService.ts** — OSRM routing *(NEW)*
- [x] **offlineService.ts** — *(resilience via existing stores)*
- [x] **fcm_service.dart →** notificationStore + expo-notifications

#### Reusable Components (2 → 8)
- [x] DouCard
- [x] BalancePill
- [x] **DouMapMarker** — custom map markers *(NEW)*
- [x] **OfflineBanner + SyncStatusIndicator** *(NEW)*
- [x] **WalletSheets** — Wallet/Deposit/Withdraw/Transfer sheets *(NEW)*
- [x] **ReportDriverSheet** — security incident reporting *(NEW)*
- [x] **PassengerPaymentFeed** — driver-side passenger list *(NEW)*
- [x] **DirectionGuideSheet** — turn-by-turn directions *(NEW)*

#### Screens (38 total)
- [x] Auth (10): RoleSelection, StudentRegister, DriverRegister, Login, DeveloperLogin, RolePicker, StaffLogin, GuardLogin, PortalVerification, PwaInstall
- [x] Student (8): Home, Wallet, Queue, QueueCalled, Pay, LostItem, LostItems, Marketplace
- [x] Driver (3): PayLink, LostItems, Delivery
- [x] Security (3): Scanner, Result, SearchStudent
- [x] Admin (8): Dashboard, StudentDirectory, DriverDirectory, IncidentLog, EmergencyMap, LostItemManagement, WalletAdjustment, TriggerLostItem
- [x] Vendor (1): OrderFeed
- [x] Developer (1): MappingScreen
- [x] Shared (4): MultiStopRoute, LocationSharing, OfflineSettings, MapScreen

### Verification
- [x] All screens wired in App.tsx
- [x] `npx tsc --noEmit` — 0 type errors
- [x] Missing deps: expo-clipboard, expo-asset, react-dom, react-native-web, @expo/metro-runtime
- [x] Fixed: LoginScreen login() signature, RoleSelectionScreen Animated._value, DeveloperMappingScreen posOffset type, metro.config.js mergeConfig
- [x] App boots via `npx expo start --web`
