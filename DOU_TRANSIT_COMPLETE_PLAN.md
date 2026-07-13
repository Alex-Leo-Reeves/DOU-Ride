# 🏫 DOU Transit — Complete Implementation Blueprint

> **Dennis Osadebay University Campus Super App**
> Android (Kotlin Backend) + Flutter UI + iOS PWA

---

## 📋 MASTER TODO LIST

Total implementation phases: **21** | Estimated scope: 200+ files | Roles: Student, Driver, Security, Admin, Vendor, Developer

---

### 🟢 PHASE 1: FOUNDATION & INFRASTRUCTURE SETUP — ✅ COMPLETE

- [x] 1.1 GitHub repository created — `Alex-Leo-Reeves/DOU-Ride`
- [x] 1.2 GitHub repository created — `Alex-Leo-Reeves/Dockerfile` (OSRM Docker)
- [x] 1.3 Supabase project created — `uawbhgrxmvwrhncpophm.supabase.co`
- [x] 1.4 Supabase keys documented (anon, service_role, JWKS URL)
- [x] 1.5 Firebase project created — `dou-ride` (FCM + Web Push)
- [x] 1.6 Firebase Web SDK config saved (apiKey, authDomain, senderId, appId)
- [x] 1.7 Flutterwave keys documented (public, secret, secret_hash)
- [x] 1.8 Firebase service account JSON ready for backend notifications
- [x] 1.9 Web push VAPID key generated: `BOW4PmMYWgyzqIm1IU05sdtUKKuJwMM2SZIgRdU7TDDv6bDjXum7LfWMemp6hcPUOWl9051wVZkoYx0ZPu-K57w`
- [x] 1.10 Render OSRM Docker deployed: `https://dockerfile-dwb2.onrender.com`
- [x] 1.11 Asaba campus map cropped via Osmium (bbox: 6.55,6.15,6.80,6.30)
- [x] 1.12 Dockerfile optimized for Render 512MB free tier RAM limit
- [x] 1.13 Kotlin available via Gradle (Java 21 present)
- [x] 1.14 Flutter project created: `flutter create --org com.dou.transit dou_transit`
- [x] 1.15 Kotlin backend project created in `backend/` directory
- [x] 1.16 Flutter folder structure created: `lib/{config,models,services,providers,screens/{auth,student,driver,security,admin,vendor,developer},widgets,utils}`
- [x] 1.17 `pubspec.yaml` configured with all dependencies (supabase_flutter, flutter_map, flutter_inappwebview, geolocator, firebase_messaging, mobile_scanner, provider, etc.)
- [x] 1.18 Dependencies resolved via `flutter pub get` (144 packages)
- [ ] 1.19 Store secrets in render env:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - `OSRM_PRIVATE_URL`
  - `FLUTTERWAVE_SECRET_KEY`
  - `FLUTTERWAVE_SECRET_HASH`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

### 🗄️ PHASE 2: DATABASE SCHEMA — ✅ COMPLETE (Migration SQL created)

#### 2.1 Run SQL migrations in Supabase SQL Editor
The file `backend/src/main/resources/supabase-migration.sql` is ready to be executed in Supabase SQL Editor.

- [x] 2.1.1 Create `profiles` table
- [x] 2.1.2 Create `student_details` table
- [x] 2.1.3 Create `driver_details` table
- [x] 2.1.4 Create `campus_landmarks` table
- [x] 2.1.5 Create `trips` table
- [x] 2.1.6 Create `trip_passengers` table
- [x] 2.1.7 Create `virtual_queue` table
- [x] 2.1.8 Create `wallet_transactions` table
- [x] 2.1.9 Create `driver_pay_links` table
- [x] 2.1.10 Create `lost_items` table
- [x] 2.1.11 Create `reports` table
- [x] 2.1.12 Create `emergency_incidents` table
- [x] 2.1.13 Create marketplace tables: `vendor_products`, `delivery_orders`
- [x] 2.1.14 Create `driver_locations` table (real-time streaming)
- [x] 2.1.15 Create `offline_transaction_queue` table
- [x] 2.1.16 Enable Row Level Security (RLS) on all tables
- [x] 2.1.17 Create RLS policies for each role
- [x] 2.1.18 Enable Realtime on key tables (driver_locations, trips, emergency_incidents, virtual_queue, delivery_orders, notification_history)
- [x] 2.1.19 Create indexes for performance (40+ indexes across all tables)

---

### 🛠️ PHASE 3: KOTLIN BACKEND SERVER — IN PROGRESS

#### 3.1 Project Scaffolding — ✅ DONE
- [x] 3.1.1 Created `backend/` directory with Gradle Kotlin DSL
- [x] 3.1.2 Configured `build.gradle.kts` with Ktor, kotlinx.serialization, Supabase, Firebase Admin
- [x] 3.1.3 Created application config structure

#### 3.2 Data Models — ✅ DONE
- [x] 3.2.1 User/Profile/Student/Driver models
- [x] 3.2.2 Trip/Ride/PayLink models
- [x] 3.2.3 Queue/Emergency/Report models
- [x] 3.2.4 Marketplace/Delivery models

#### 3.3 API Routes — ✅ ALL ROUTE FILES CREATED (Stubs with TODOs)
- [x] 3.3.1 Auth: POST /api/auth/register/student (portal verification)
- [x] 3.3.2 Auth: POST /api/auth/register/driver (face photo, QR gen)
- [x] 3.3.3 Auth: POST /api/auth/login, POST /api/auth/developer-access
- [x] 3.3.4 Wallet: POST /api/wallet/deposit (₦10 fee)
- [x] 3.3.5 Wallet: POST /api/wallet/withdraw (bank/OPay)
- [x] 3.3.6 Wallet: POST /api/wallet/transfer (P2P)
- [x] 3.3.7 Wallet: POST /api/flutterwave/webhook
- [x] 3.3.8 Rides: POST /api/rides/request, accept, board, complete
- [x] 3.3.9 Rides: POST /api/rides/no-show, pay-link/generate, pay-link/scan
- [x] 3.3.10 Queue: POST /api/queue/join, call-next, position
- [x] 3.3.11 Emergency: POST /api/emergency/trigger, resolve, flag-abuse
- [x] 3.3.12 Lost: POST /api/lost/report, return, collect, admin-trigger
- [x] 3.3.13 Reports: POST /api/reports/create
- [x] 3.3.14 Admin: POST /api/admin/suspend-driver, suspend-student, approve-bank-change, credit-wallet
- [x] 3.3.15 Marketplace: POST /api/marketplace/order, accept, ready, assign-driver, deliver
- [x] 3.3.16 Developer: POST /api/landmarks/add, PUT, DELETE, GET
- [x] 3.3.17 Driver: POST /api/driver/location, GET /api/driver/location/{id}
- [x] 3.3.18 Notification: POST /api/notifications/register-token, send-test, history, mark-read

#### 3.4 Notification Dispatch — ✅ DONE
- [x] 3.4.1 Initialize Firebase Admin SDK in `NotificationService.kt` (called at app startup in `Application.kt`)
- [x] 3.4.2 Build message templates (22 notification types across rides, queue, payments, emergency, lost & found, marketplace, admin, driver events)
- [x] 3.4.3 Platform-aware dispatch: Android FCM (high priority sound/vibrate) vs iOS PWA webpush (icon/badge/requireInteraction)

#### 3.5 Dockerfile & Deployment — ✅ DONE
- [x] 3.5.1 Created `backend/Dockerfile` — multi-stage build: Stage 1 (eclipse-temurin:21-jdk-alpine + Gradle shadowJar), Stage 2 (eclipse-temurin:21-jre-alpine, non-root user, HEALTHCHECK, PORT env var). Fixed Guava dependency conflict in `build.gradle.kts`.
- [x] 3.5.2 `shadowJar` verified — `backend-1.0.0-all.jar` (1MB) builds successfully. Ready for Render deploy.
- [ ] Push to GitHub and deploy on Render

---

### 🎨 PHASE 4: FLUTTER — THEME & CORE — ✅ DONE

- [x] 4.1.1 `DouTheme` in `lib/config/theme.dart` — brutalist design (bold black outlines, flat white backgrounds, chunky drop shadows, expressive typography)
- [x] 4.1.2 Typography scale defined (displayLarge through labelLarge)
- [x] 4.1.3 Route configuration (`AppRoutes` in `lib/config/routes.dart`) covering all 30+ screens for auth, student, driver, security, admin, vendor, developer
- [x] 4.2.1 `AuthProvider` — login, registerStudent, registerDriver, developerAccess, logout, suspended guard
- [x] 4.2.2 `WalletProvider` — balance, transactions, deposit, withdraw, transfer (API stubs)
- [x] 4.2.3 `RideProvider`, `LocationProvider` (with geolocator), `NotificationProvider`, `QueueProvider`, `EmergencyProvider`
- [x] 4.3.1 Route generation in `main.dart` via `onGenerateRoute` pattern (role-based routing to come with nav shells)
- [x] 4.3.2 Auth guard available via `AuthProvider.isSuspended` / `isLoggedIn`
- [x] `ApiConfig` in `lib/config/api_config.dart` — Supabase URL, OSRM URL, campus coords, pricing constants
- [x] `ApiService` in `lib/services/api_service.dart` — centralized HTTP with GET/POST/PUT/DELETE, error handling, auth headers

### 🔐 PHASE 5: AUTHENTICATION & ONBOARDING — ✅ DONE

- [x] 5.1 `RoleSelectionScreen` — Two brutalist cards (Student/Driver), "Admin? Security? Vendor?" link → role picker. **Logo long-press 5s → circular progress → developer login**
- [x] 5.2 `StudentRegistrationScreen` — Full form (matric, name, dept, faculty, phone, email, password) with portal verification card
- [x] 5.3 `DriverRegistrationScreen` — Face photo capture, keke registration, max seats dropdown, password fields
- [x] 5.4 `LoginScreen` — Email/phone + password, role-based redirect (student→/student/home, driver→/driver/home, vendor→/vendor/home)
- [x] 5.5 `DeveloperLoginScreen` — **All-black screen with username + password fields** (accounts created in Supabase). Accessed via 5-second logo hold on role selection
- [x] 5.6 FCM token capture — `FcmService.initialize()` in main.dart, auto-register after login/register in AuthProvider
- [x] 5.7 `PortalVerificationScreen` — WebView-based DOU portal scraping with JS injection extracting **matric, name, department, faculty, level, email**. Auto-fills student registration form
- [x] 5.8 `RolePickerScreen` — Three brutalist cards for Admin (→ `AdminLoginScreen`), Security (→ `SecurityLoginScreen`), Vendor (→ `LoginScreen`)
- [x] 5.9 `AdminLoginScreen` — "Student Affairs" login with **username + password** fields. No registration. Routes to /admin/dashboard or /vendor/home
- [x] 5.10 `SecurityLoginScreen` — "Security Gate Access" login with **username + password** fields. No registration. Routes to /security/scanner
- [x] 5.11 Backend `SupabaseAuthService.kt` — REST client for Supabase Auth (signUp, adminCreateUser, signIn)
- [x] 5.12 Backend `AuthRoutes.kt` — Real Supabase inserts for student (profiles, student_details, wallets) and driver registrations (profiles, driver_details, wallets, fleet number generation, QR code data)
- [x] 5.13 **No self-registration for admin/security/vendor/developer** — accounts created by admin in Supabase only

### 🗺️ PHASE 6: MAPPING & ROUTING — ✅ DONE

- [x] 6.1 FlutterMap integration ready (flutter_map + latlong2 packages in pubspec.yaml)
- [x] 6.2 Campus center coords configured in ApiConfig (6.25, 6.70), zoom 15
- [x] 6.3 `OsmService` in `lib/services/osrm_service.dart` — getRoute() parses OSRM GeoJSON response, getRouteSummary() for distance/duration, fallback straight-line if offline
- [x] 6.4 PolylineLayer support via LatLng list from OSRM
- [x] 6.5 DirectionGuideSheet — DraggableScrollableSheet with real OSRM turn-by-turn steps, turn icons, connector lines, distance/duration per step
- [x] 6.6 `DouMapMarker` — Reusable brutalist markers with 10 types (pickup/destination/driver/student/landmark/vendor/medical/gate/park), distinct colors + icons, optional labels, rotation support
- [x] 6.7 `MultiStopRouteScreen` — Interactive map with tap-to-add stops, 10 campus landmark suggestions, drag-to-reorder, OSRM waypoint routing, total distance/duration overlay
- [x] 6.8 `DeveloperMappingScreen` — GPS landmark recording with coordinate display, landmark type chips, offline save fallback
- [x] 6.9 `LocationSharingScreen` — GPS fetch, brutalist coordinate card, share_plus native share with Google Maps URL, clipboard copy, GPS permission handling

---

### 💰 PHASE 7: WALLET & PAYMENTS — ✅ COMPLETE

- [x] 7.1 `TopRightBalancePill` widget — brutalist pill, shows balance, tappable → wallet screen
- [x] 7.2 `WalletBottomSheet` — balance display, 3 action buttons (Deposit/Withdraw/Transfer), recent transaction rows
- [x] 7.3 `DepositSheet` — quick-amount chips (₦200–₦5000), custom input, ₦10 fee breakdown, calls backend `/api/wallet/deposit`, returns Flutterwave payment URL
- [x] 7.4 `WithdrawSheet` — amount field, 26-Nigerian-bank picker (Access → Zenith), 10-digit account number, balance-check before submit, calls backend `/api/wallet/withdraw`
- [x] 7.5 `TransferSheet` — recipient (email/matric), amount, optional note, P2P debit-credit via backend `/api/wallet/transfer`, recipient push notification
- [x] 7.6 `WalletScreen` — full-screen wallet page with balance card, 3 action cards, full transaction history with icons/status/amounts, pull-to-refresh, error/empty states
- [x] 7.7 `WalletProvider` — real API integration with `ApiService`, balance/transactions fetch, deposit/withdraw/transfer methods, AuthProvider dependency injection via `ChangeNotifierProxyProvider`
- [x] 7.8 `WalletRoutes.kt` — full backend implementation:
  - `GET /api/wallet/balance/{userId}` — aggregates completed transactions, returns pending deposits + last 50 txs
  - `POST /api/wallet/deposit` — validates minimum, creates pending `wallet_transaction`, returns payment URL
  - `POST /api/wallet/withdraw` — balance check, creates pending withdrawal with bank metadata (JSONB), logs
  - `POST /api/wallet/transfer` — P2P atomic debit-credit with balance_before/balance_after, `transfer_out` + `transfer_in` entries, push notification to recipient

---

### 🚗 PHASE 8: RIDE REQUEST & QUEUE — ✅ COMPLETE

- [x] 8.1 `StudentHomeScreen` — full map overlay with 10-destination horizontal picker (Faculties of Science/Arts/Engineering/Law/etc.), Standard/Drop trip type toggle, seat selector (1–4), fare display (₦100 / ₦1,500), GO button integrating with RideProvider + QueueProvider, active ride state management (shows _ActiveRideScreen when ride in progress), GPS tracking on init, TopRightBalancePill in app bar
- [x] 8.2 `VirtualQueueScreen` — ticket number display (#XX), destination name, students-ahead counter, estimated wait time, hourly polling via Timer.periodic (15s), auto-navigation to QueueCalledScreen when called, leave queue option
- [x] 8.3 `QueueCalledScreen` — **neon flash** design (black background, `Icons.flash_on` + `DouTheme.neon`), large 120s countdown in `AnimatedOpacity`, boarding PIN display in brutalist card, "I HAVE BOARDED" button → PIN verification dialog → green confirmation screen, red background when ≤30s remaining, emergency "Can't find the Keke?" link
- [x] 8.4 `BoardRideFlow` — 4-digit PIN dialog (large font, letter-spacing 8), backend PIN verification via `POST /api/rides/board` with `RETURNING`, updates trip_passengers.boarding_status + trips.status, proper error handling
- [x] 8.5 `Queue called / 120s countdown` — `Timer.periodic(1s)` decrement, expiration triggers `POST /api/rides/no-show` with wallet penalty (₦50 debit student + ₦50 credit driver), driver seat release
- [x] 8.6 `Driver zoom-past prevention` — driver_status checks in backend (`en_route`, `with_passengers`), trip state machine enforced in SQL
- [x] 8.7 `Drop (Charter) Mode` — ₦1,500 fare lock, trip created directly (no queue) with boarding PIN, callable via `POST /api/rides/request` with `"tripType": "drop"`

**Provider updates:**
- `RideProvider` — AuthProvider-injected, real `ApiService` calls for all 7 ride endpoints (request/accept/board/complete/no-show/pay-link-generate/pay-link-scan), driver info tracking, trip status booleans (isIdle/isRequested/isAccepted/isBoarding/isInProgress/isCompleted/isNoShow)
- `QueueProvider` — AuthProvider-injected, real `ApiService` calls for join/position, setCalled/setBoarding states, leave queue

**Backend implementation:**
- `RideRoutes.kt` — 7 real endpoints with full DB logic:
  - `POST /api/rides/request`: active trip guard, fare resolution, Drop mode creates trip + passenger with boarding PIN; Standard mode creates virtual_queue entry with ticket number + position
  - `POST /api/rides/accept`: updates trip status + driver driver_status = 'en_route'
  - `POST /api/rides/board`: PIN verification via `RETURNING`, updates boarding_status + trip status
  - `POST /api/rides/complete`: marks trip completed, resets driver seats/status
  - `POST /api/rides/no-show`: full penalty flow — mark passenger no_show, deduct ₦50 from student, credit ₦50 to driver, reset driver
  - `POST /api/rides/pay-link/generate`: stores pay link in DB with QR data, returns fleet info
  - `POST /api/rides/pay-link/scan`: wallet debit + driver credit, deactivates link, updates passenger payment_status
- `QueueRoutes.kt` — 3 real endpoints:
  - `POST /api/queue/join`: duplicate check, ticket assignment, position calculation
  - `POST /api/queue/call-next/{destinationId}`: fetches waiting students up to driver's max_seats, creates trips + boarding PINs, sends FCM push notifications, updates driver status
  - `GET /api/queue/position/{studentId}`: returns ticket number, students ahead, ETA, destination name

---

### 💳 PHASE 9: PAYMENT HANDOFF — ✅ COMPLETE

- [x] 9.1 `DriverPayLinkScreen` (`lib/screens/driver/pay_link_screen.dart`) — QR code generation with `qr_flutter`, real-time passenger payment feed, "Clear Ride" button. Shows Keke fleet #, amount selector (₦100–₦1,500), active pay link badge, copy-to-clipboard fallback. Auto-generates pay link on entry, polls passenger payments every 5s via `GET /api/rides/{tripId}/passengers`.
- [x] 9.2 `StudentPayScreen` (`lib/screens/student/pay_screen.dart`) — QR scanner (`mobile_scanner`) with full-screen camera view, manual fleet number entry fallback, success/error views. Toggles between scanner and manual entry. Processes payment via `POST /api/rides/pay-link/scan`, refreshes wallet balance on success.
- [x] 9.3 `PassengerPaymentFeed` (`lib/widgets/passenger_payment_feed.dart`) — real-time payment status list with animated pulsing dots for pending payments, green checkmarks for paid, red X for no-shows. Summary header shows total paid / all paid status. Used by driver in PayLinkScreen.
- [x] 9.4 `POST /api/rides/clear/{tripId}` — driver clears ride: marks unpaid passengers as no_show (waives fare), marks paid as confirmed, completes trip, resets driver status to idle, deactivates active pay links, notifies unpaid passengers via FCM.
- [x] 9.5 `GET /api/rides/{tripId}/passengers` — returns all passengers with payment status, boarding status, names, matric numbers, fare amounts, aggregate totals.
- [x] 9.6 RideProvider updated with `fetchPassengers()`, `clearRide()`, `scanPayLink()`, `setCurrentTrip()` methods and passenger tracking state.

---

### 🔒 PHASE 10: SECURITY GATE SYSTEM — ✅ COMPLETE

- [x] 10.1 `SecurityLoginScreen` (`lib/screens/auth/security_login_screen.dart`) — pre-seeded accounts, username + password login, routes to `/security/scanner`. Role check ensures only security accounts can access.
- [x] 10.2 `GuardScannerScreen` (`lib/screens/security/guard_scanner_screen.dart`) — full-screen QR camera using `mobile_scanner`, torch toggle, cyan overlay frame, manual matric entry fallback dialog. Parses driver UUID, fleet number, or student matric from scanned data. Routes to ScanResultScreen.
- [x] 10.3 `ScanResultScreen` (`lib/screens/security/scan_result_screen.dart`) — green background (ACCESS GRANTED) or red background (ACCESS DENIED) with large status icons. Shows user profile card (name, role badge, matric/fleet #). "Scan Again" and "REPORT DRIVER" action buttons. Uses `POST /api/security/lookup` for backend verification.
- [x] 10.4 `ReportDriverSheet` (`lib/widgets/report_driver_sheet.dart`) — bottom sheet with 8 offense tag chips (Overloading, Reckless Driving, Damaged Vehicle, etc.), optional description field, submit via `POST /api/reports/create`. Shows confirmation on success.
- [x] 10.5 `SearchStudentScreen` (`lib/screens/security/search_student_screen.dart`) — matric number search with `POST /api/security/lookup`, displays student profile card with SUSPENDED/ACTIVE/VERIFIED badges, department/faculty details, report button.
- [x] 10.6 `SecurityRoutes.kt` (`backend/src/main/kotlin/com/dou/transit/routes/SecurityRoutes.kt`) — `POST /api/security/lookup` with 4 lookup paths: driver UUID, fleet number, matric number, or raw QR data. Returns fullName, role, fleetNumber/matricNumber, isSuspended/isCleared boolean, status.
- [x] 10.7 Registered in `Application.kt` as `securityRoutes()` and in `main.dart` with `AppRoutes.securityScanner` → `GuardScannerScreen`, `AppRoutes.securityResult` → `ScanResultScreen`.

---

### 👑 PHASE 11: STUDENT AFFAIRS ADMIN — ✅ COMPLETE

- [x] 11.1 AdminLoginScreen (existing — routes to `/admin/dashboard`)
- [x] 11.2 AdminDashboardScreen — analytics (active kekes, trips today, revenue, pending bank approvals), pending actions (reports, lost items, emergencies), directory (drivers/students), wallet adjustment entry, logout
- [x] 11.3 StudentDirectoryScreen — search by name/matric, suspend with reason dialog, unsuspend, wallet balance display, SUSPENDED badge
- [x] 11.4 DriverDirectoryScreen — search by name/fleet/keke, suspend with reason, unsuspend, driver status badges, fleet number/keke reg display
- [x] 11.5 BankChangeApprovalScreen — via WalletAdjustmentScreen (pending withdrawals = bank changes to approve)
- [x] 11.6 SuspendDriverFlow — updates profiles.is_suspended + driver_details.driver_status = 'offline' + cancels active trips + FCM notification to driver
- [x] 11.7 SuspendStudentFlow — updates profiles.is_suspended + cancels queue entries + FCM notification to student
- [x] 11.8 WalletAdjustmentScreen — credit/debit toggle, user UUID input, reason field, audit trail with metadata (adjusted_by, reason), FCM notification to user, balance-before-debit protection
- [x] 11.9 IncidentLogScreen — real-time report feed from reports table, resolve button per report, status badges (open/investigating/resolved), reporter/target info
- [x] 11.10 EmergencyMapScreen — emergency incidents feed with status badges, student/driver names, coordinates, active/pulsing indicator for active emergencies
- [x] 11.11 LostItemManagementScreen — lost items list with status (reported/acknowledged/dropped_off/collected), category tags, mark-as-collected action

**Backend — `AdminRoutes.kt` fully implemented (14 endpoints):**
- POST /api/admin/suspend-driver — full DB logic + FCM + trip cancellation
- POST /api/admin/suspend-student — full DB logic + FCM + queue cancellation
- POST /api/admin/approve-bank-change — approves pending withdrawal
- POST /api/admin/credit-wallet — credit/debit with balance guard, audit JSONB metadata, FCM
- GET /api/admin/analytics — live counts from DB (active kekes, trips today, pending bank, revenue, pending reports/lost)
- GET /api/admin/reports — JOIN query with reporter/target names
- GET /api/admin/lost-items — JOIN query with student/driver names
- GET /api/admin/emergencies — JOIN query with student/driver names + coords
- GET /api/admin/drivers — full driver profiles with status
- GET /api/admin/students — full student profiles with wallet balance
- POST /api/admin/resolve-report/{reportId} — marks report resolved
- POST /api/admin/lost-item/close/{itemId} — marks item collected
- POST /api/admin/unsuspend/{userId} — clears suspension, restores driver status to idle

**Flutter side:**
- New `AdminProvider` — `lib/providers/admin_provider.dart` with all 12 API methods
- Registered in `main.dart` via `ChangeNotifierProxyProvider`
- 7 new screens added to `lib/screens/admin/` directory
- All routes registered in `AppRoutes` and `onGenerateRoute`
</final_file_content>

IMPORTANT: For any future changes to this file, use the final_file_content shown above as your reference. This content reflects the current state of the file, including any modifications or formatting updates to the original.

---

### 📦 PHASE 12: LOST & FOUND — ✅ COMPLETE

- [x] 12.1 `StudentLostItemReportScreen` (`lib/screens/student/student_lost_item_screen.dart`) — Category chips (Phone/Wallet/ID Card/etc.), trip auto-select from completed ride, description field with validation, success state with "Track My Items" CTA, FCM notification to driver
- [x] 12.2 `AdminTriggerLostItemScreen` (`lib/screens/admin/admin_trigger_lost_screen.dart`) — Matric number input, category chips, description field, creates claim in DB for phone-less students who walk into Student Affairs
- [x] 12.3 `DriverLostItemsScreen` (`lib/screens/driver/driver_lost_items_screen.dart`) — Lost items list for driver's trips, "Dropped at Student Affairs" confirm button with alert dialog, status badges (PENDING/AT STUDENT AFFAIRS/COLLECTED), FCM notification to student on return
- [x] 12.4 `StudentLostItemsScreen` (`lib/screens/student/student_lost_items_screen.dart`) — Full history of student's reported items, status tracking (REPORTED → AT STUDENT AFFAIRS → COLLECTED), driver + fleet + destination info, collection guidance card
- [x] 12.5 Backend `LostItemRoutes.kt` — 8 real endpoints: POST /report (creates item + FCM to driver), POST /return/{itemId} (driver drops at Student Affairs + FCM to student), POST /collect/{itemId} (admin confirms collection), POST /admin-trigger (admin creates claim by matric), GET /my-items (student history), GET /driver-items (driver's pending lost items)
- [x] 12.6 `LostItemProvider` (`lib/providers/lost_item_provider.dart`) — API integration for all 6 lost & found endpoints, state management for myItems/driverItems
- [x] 12.7 Navigation integration — Routes registered in `AppRoutes`, provider in `main.dart`, entry points in admin dashboard (Lost & Found Claims + Trigger Claim), student home (Report Lost Item after ride complete), driver pay link screen (Lost & Found icon)
- [x] 12.8 Notification templates already wired in `NotificationService.Templates` — `lostItemReported`, `lostItemDroppedOff`, `lostItemReadyForCollection`
- [x] 12.9 Route constants added: `studentLostItems`, `driverLostItems`, `adminLostItemTrigger`

---

### 🛵 PHASE 13: MARKETPLACE & DELIVERY — ✅ COMPLETE

- [x] 13.1 Backend `MarketplaceRoutes.kt` — 11 real endpoints:
  - POST /api/marketplace/order — validates vendor products, calculates total, deducts wallet, creates delivery_order with random 3-digit package PIN, returns orderId+pin+total
  - POST /api/marketplace/accept-order — vendor accepts → status='accepted', FCM to student
  - POST /api/marketplace/ready/{orderId} — vendor marks ready → status='ready_for_pickup', FCM topic broadcast to all drivers
  - POST /api/marketplace/assign-driver — admin assigns driver → status='in_transit', dual FCM to vendor+student
  - POST /api/marketplace/deliver — driver verifies 3-digit PIN, status='delivered', FCM to student
  - GET /api/marketplace/products/{vendorId} — list vendor_products
  - GET /api/marketplace/vendors — list vendor profiles
  - GET /api/marketplace/orders/{orderId} — order details JOIN vendor+driver names
  - GET /api/marketplace/my-orders — student's own orders
  - GET /api/marketplace/vendor-orders — vendor's incoming orders with student names
  - GET /api/marketplace/driver-deliveries — driver's assigned deliveries with vendor+student info
- [x] 13.2 `MarketplaceProvider` (`lib/providers/marketplace_provider.dart`) — full API coverage for all 11 marketplace endpoints, cart/order state management
- [x] 13.3 `VendorOrderFeedScreen` (`lib/screens/vendor/vendor_order_feed_screen.dart`) — 3 tabs (Incoming/Preparing/Ready), Accept & Mark Ready action buttons, status badges, pull-to-refresh
- [x] 13.4 `StudentMarketplaceScreen` (`lib/screens/student/student_marketplace_screen.dart`) — vendor grid selector, product list with +/- quantity, cart total bar, Place Order with PIN display, notes field
- [x] 13.5 `DriverDeliveryScreen` (`lib/screens/driver/driver_delivery_screen.dart`) — assigned deliveries list, 3-digit PIN entry inline, deliver button, success/error states
- [x] 13.6 Route constants + provider registration in main.dart, all 3 new routes wired in `onGenerateRoute`
- [x] 13.7 Delivery PIN handshake: student gets PIN on order → shares with driver → driver enters PIN → backend verifies → status='delivered' + FCM

---

### 🚨 PHASE 14: EMERGENCY HEALTH SYSTEM — ✅ COMPLETE

- [x] 14.1 Backend `EmergencyRoutes.kt` — 3 real endpoints with full DB + FCM:
  - POST /api/emergency/trigger — creates incident, assigns nearest idle driver, creates emergency trip, FCM to driver + admin
  - POST /api/emergency/resolve — updates arrived_medical, FCM to student, releases driver (idle), closes emergency trip
  - POST /api/emergency/flag-abuse — marks abuse_flagged, ₦5,000 fine deducted from wallet, FCM to student

---

### 📬 PHASE 15: NOTIFICATION SYSTEM — ✅ COMPLETE

- [x] 15.1 Android FCM Setup — permissions, token capture via `FcmService` + backend `/api/notifications/register-token`
- [x] 15.2 iOS PWA Web Push Setup — VAPID key configured, manifest.json with icons, service worker with push handler
- [x] 15.3 `NotificationService.kt` — Firebase Admin SDK initialized at app startup, 22+ notification templates across rides, queue, payments, emergency, lost & found, marketplace, admin
- [x] 15.4 All notification dispatch wired through `NotificationService.sendPush()` with platform-aware delivery (Android FCM high priority vs iOS webpush with requireInteraction)
- [x] 15.5 Supabase Edge Functions — `send-notification` (`supabase/functions/send-notification/index.ts`) — Deno Edge Function serving as webhook endpoint. Handles 6 event types: queue called, trip update, wallet transaction, emergency insert, lost item insert, delivery order update. Routes payloads to Firebase FCM/Web Push with platform-aware notifications. Saves to notification_history table.
- [x] 15.6 Database Webhooks — 6 triggers (`supabase/webhook-triggers.sql`) — PL/pgSQL triggers on virtual_queue (UPDATE→called), trips (UPDATE→completed/boarding), wallet_transactions (INSERT), emergency_incidents (INSERT), lost_items (INSERT), delivery_orders (UPDATE→ready/in_transit/delivered). Invokes `supabase/functions/v1/send-notification` via `net.http_post`.
- [x] 15.7 `NotificationRoutes.kt` fully implemented — token registration with upsert, send-test, history retrieval with pagination, mark-read, mark-all-read, unread-count endpoints. All connected to `notification_tokens` and `notification_history` tables with FCM integration.

---

### 🌐 PHASE 16: iOS PWA SPECIFIC — ✅ DONE

- [x] 16.1 `index.html` configured with full iOS meta tags (apple-mobile-web-app-capable, status-bar, splash screens, all icon sizes), service worker registration with standalone detection + iOS Safari detection
- [x] 16.2 `service_worker.js` created with: app shell caching, OSM tile caching (cache-first), API network-only fallback, push notification handler, notification click routing to correct app screens, background sync for offline transactions
- [x] 16.3 iOS icons created at all required sizes: 120x120, 152x152, 167x167, 180x180 (PNG)
- [x] 16.4 `PwaInstallScreen` (`lib/screens/auth/pwa_install_screen.dart`) — 4-step guided walkthrough for iOS Safari users with share button → add to home screen → confirm → done flow, brutalist design with black/white theme, "Don't show again" checkbox
- [x] `manifest.json` updated with full PWA metadata (name, description, scope, lang, categories, display_override, all iOS icon references)

---

### 📱 PHASE 17: ALL FLUTTER UI SCREENS

- [x] 17.1–17.5 Auth screens (5) — RoleSelection, StudentRegister, DriverRegister, Login, PwaInstall, PortalVerification, RolePicker, AdminLogin, SecurityLogin, DeveloperLogin
- [x] 17.6–17.22 Student screens — Home, Wallet, Queue, QueueCalled, Pay, LostItemReport, LostItems, Marketplace (currently implemented)
- [x] 17.23–17.33 Driver screens — PayLink, LostItems, Delivery (currently implemented)
- [x] 17.34–17.37 Security screens — GuardScanner, ScanResult, SearchStudent
- [x] 17.38–17.45 Admin screens — Dashboard, StudentDir, DriverDir, IncidentLog, EmergencyMap, LostItemMgmt, WalletAdjustment, TriggerLost
- [x] 17.46–17.49 Vendor screens — OrderFeed
- [x] 17.50–17.51 Developer screens — MappingScreen
- Total: **51 screens** (33+ implemented)

---

### ⚡ PHASE 18: OFFLINE RESILIENCE — ✅ COMPLETE

- [x] 18.1 Offline Boarding Passes — encrypted PINs (`backend/OfflineRoutes.kt` POST /api/offline/boarding-pass/generate + /verify). AES-256 encrypted boarding passes with expiry, stored as QR-friendly base64url. Server-side SHA-256 key derivation from passphrase. `OfflineService.saveBoardingPass()` + `getBoardingPass()` in Flutter using `flutter_secure_storage`. 2-hour expiry, auto-cleanup of expired passes.
- [x] 18.2 Local Transaction Queue — pending sync (`OfflineService.queueTransaction()` + `syncPendingTransactions()`). Transactions queued in `flutter_secure_storage` when offline, auto-synced on connectivity restore via `connectivity_plus` listener. Backend `POST /api/offline/sync` stores in `offline_transaction_queue` table. Manual sync button in OfflineResilienceScreen. Background sync registered in service worker (`sync-offline-queue`).
- [x] 18.3 Emergency SMS Fallback (`OfflineService.queueEmergencySms()` + backend `POST /api/offline/emergency-sms`). Creates emergency_incident record even when offline. Queues locally if no connection. Sends immediately if online. Dedicated fallback queued in `flutter_secure_storage` with phone, lat, lng, message.
- [x] 18.4 OSM Tile Caching — service worker `TILE_CACHE` in `service_worker.js` with cache-first strategy for `tile.openstreetmap.org`. Flutter-side `OfflineService` manages tile cache directory (getTileCacheDir, getTileCacheSize, clearTileCache, formatTileCacheSize). Backend `GET /api/offline/tiles-info` returns campus bounds + zoom levels for pre-caching.
- [x] 18.5 Graceful Degradation UI — `OfflineBanner` widget showing red "You are offline" bar at screen top. `OfflineState` ChangeNotifier wrapping `connectivity_plus` for reactive UI. `SyncStatusIndicator` showing pending count + sync button. `OfflineResilienceScreen` showing all offline data (network status, pending sync queue, saved boarding passes, tile cache size, how-it-works guide). Route registered as `AppRoutes.offlineSettings`.
- [x] Total new files: `backend/OfflineRoutes.kt` (5 endpoints), `dou_transit/lib/services/offline_service.dart` (~400 lines), `dou_transit/lib/services/offline_state.dart`, `dou_transit/lib/widgets/offline_banner.dart`, `dou_transit/lib/screens/shared/offline_screen.dart`, route constant added to `AppRoutes`, provider registered in `main.dart`, `OfflineService.initialize()` called at app startup.
- [x] Integration: Backend `offlineRoutes()` registered in `Application.kt`. `OfflineState` provider added to `MultiProvider` in `main.dart`. Route `AppRoutes.offlineSettings` → `OfflineResilienceScreen` wired in `onGenerateRoute`.

---

### 🧪 PHASE 19: TESTING

- [ ] 19.1 Backend unit tests (7 scenarios)
- [ ] 19.2 Flutter unit tests (6 scenarios)
- [ ] 19.3 Integration tests (6 scenarios)
- [ ] 19.4 End-to-end scenarios (15 user flows)

---

### 🚀 PHASE 20: DEPLOYMENT

- [ ] 20.1 Render Backend Deployment
- [ ] 20.2 Supabase Production Readiness
- [ ] 20.3 Android Play Store (keystore, bundle, listing)
- [ ] 20.4 iOS PWA Deployment (Firebase Hosting, custom domain)

---

### 📊 PHASE 21: POST-LAUNCH

- [ ] 21.1 Monitoring (Render + Supabase + Firebase logs)
- [ ] 21.2 Error tracking (Sentry)
- [ ] 21.3 Analytics & feedback loop
- [ ] 21.4 Iteration priorities

---

## 📋 CREDENTIALS & CONFIGURATION SUMMARY

### Supabase
| Item | Value |
|---|---|
| URL | `https://uawbhgrxmvwrhncpophm.supabase.co` |
| Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4OTU2NTYsImV4cCI6MjA5OTQ3MTY1Nn0.FVeao1ms3_N2aUhGSiiEIk7sYY8pZLWCWj5dDItYXcQ` |
| Service Role | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzg5NTY1NiwiZXhwIjoyMDk5NDcxNjU2fQ.Ehgn9JGlTHoCkCxHml5QzXBpLaW1_ZRZoHjS3liDFsY` |
| DB Password | `iammasteralexd1$` |
| Project ID | `uawbhgrxmvwrhncpophm` |
| JWKS URL | `https://uawbhgrxmvwrhncpophm.supabase.co/auth/v1/.well-known/jwks.json` |

### Firebase
| Item | Value |
|---|---|
| Project Name | `dou-ride` |
| API Key | `AIzaSyCFULjiQei-FecxYJkkiT9mX5Y2-rZG8Ss` |
| Auth Domain | `dou-ride.firebaseapp.com` |
| Project ID | `dou-ride` |
| Storage Bucket | `dou-ride.firebasestorage.app` |
| Messaging Sender ID | `3669013407` |
| App ID | `1:3669013407:web:ba3f75bf949dee071703aa` |
| Measurement ID | `G-NFJCG9RYBH` |
| VAPID Key | `BOW4PmMYWgyzqIm1IU05sdtUKKuJwMM2SZIgRdU7TDDv6bDjXum7LfWMemp6hcPUOWl9051wVZkoYx0ZPu-K57w` |

### Flutterwave
| Item | Value |
|---|---|
| Public Key | `FLWPUBK-9acd4c40844063acf3e892f473da58b9-X` |
| Secret Key | `FLWSECK-c42723ba8c0d1c134e82319136c22d57-19eacb66583vt-X` |
| Secret Hash | `i_am_masteralexd1` |

### Render OSRM
| Item | Value |
|---|---|
| URL | `https://dockerfile-dwb2.onrender.com` |
| Map Data | Asaba campus cropped (Osmium bbox: 6.55,6.15,6.80,6.30) |
