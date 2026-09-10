package com.dou.transit.models

import kotlinx.serialization.Serializable

// ============================================================
// ENUMS
// ============================================================

enum class UserRole { student, driver, security, admin, vendor, developer }
enum class DriverStatus { offline, idle, en_route, with_passengers, emergency }
enum class TripType { standard, drop, emergency, delivery }
enum class TripStatus { requested, accepted, boarding, in_progress, completed, cancelled, no_show }
enum class BoardingStatus { pending, confirmed, no_show }
enum class PaymentStatus { unpaid, paid, refunded }
enum class QueueStatus { waiting, called, boarding, completed, cancelled, no_show }
enum class TransactionType {
    deposit, withdrawal, ride_payment, ride_payout, refund, penalty, platform_fee, transfer_in, transfer_out
}
enum class TransactionStatus { pending, completed, failed, refunded }
enum class LandmarkType { destination, pickup_zone, vendor, medical_center, park, gate }
enum class LostItemStatus { reported, acknowledged, dropped_off, collected, closed }
enum class IncidentType {
    overloading, reckless_driving, damaged_vehicle, unruly_behavior,
    no_ticket, refused_pin, verbal_abuse, gate_disturbance, queue_jumping, other
}
enum class ReportStatus { open, investigating, resolved, dismissed }
enum class EmergencyStatus { active, en_route, arrived_medical, resolved, abuse_flagged }
enum class OrderStatus { pending, accepted, preparing, ready_for_pickup, in_transit, delivered, cancelled }

// ============================================================
// AUTH MODELS
// ============================================================

@Serializable
data class RegisterStudentRequest(
    val matricNumber: String,
    val fullName: String,
    val department: String,
    val faculty: String,
    val phone: String,
    val email: String,
    val password: String
)

@Serializable
data class RegisterDriverRequest(
    val fullName: String,
    val phone: String,
    val kekeRegistration: String,
    val licensePlate: String,
    val maxSeats: Int = 3,
    val facePhotoBase64: String? = null,
    val password: String
)

@Serializable
data class LoginRequest(val emailOrPhone: String, val password: String)

@Serializable
data class DeveloperAccessRequest(val passcode: String)

@Serializable
data class AuthResponse(
    val userId: String,
    val token: String,
    val role: String,
    val fullName: String,
    val needsOnboarding: Boolean = false
)

@Serializable
data class PortalScrapeResult(
    val matricNumber: String,
    val fullName: String,
    val department: String
)

@Serializable
data class PortalCheckRequest(val matricNumber: String)

@Serializable
data class CheckMatricResponse(
    val exists: Boolean,
    val email: String? = null,
    val fullName: String? = null,
    val department: String? = null,
    val faculty: String? = null,
    val error: String? = null
)

// ============================================================
// WALLET MODELS
// ============================================================

@Serializable
data class DepositRequest(val amount: Double, val userId: String? = null)

@Serializable
data class DepositResponse(val paymentUrl: String, val transactionRef: String)

@Serializable
data class WithdrawRequest(
    val bankCode: String,
    val accountNumber: String,
    val amount: Double,
    val bankName: String? = null,
    val userId: String? = null
)

@Serializable
data class TransferRequest(
    val recipientId: String,
    val amount: Double,
    val note: String? = null,
    val userId: String? = null
)

@Serializable
data class SettlementAccountRequest(
    val bankName: String,
    val accountNumber: String,
    val bankCode: String? = null,
    val userId: String? = null
)

@Serializable
data class WalletBalanceResponse(
    val balance: Double,
    val pendingBalance: Double,
    val transactions: List<WalletTransactionItem>
)

@Serializable
data class WalletTransactionItem(
    val id: String,
    val type: String,
    val amount: Double,
    val fee: Double = 0.0,
    val balance_before: Double = 0.0,
    val balance_after: Double = 0.0,
    val status: String,
    val reference: String? = null,
    val description: String? = null,
    val created_at: String? = null
)

@Serializable
data class VerifyDepositResponse(
    val verified: Boolean,
    val status: String,
    val message: String? = null,
    val netAmount: Double? = null,
    val newBalance: Double? = null
)

@Serializable
data class TransactionSummary(
    val id: String,
    val type: String,
    val amount: Double,
    val status: String,
    val createdAt: String
)

@Serializable
data class FlutterwaveWebhookPayload(
    val `event`: String,
    val `data`: FlutterwaveWebhookData
)

@Serializable
data class FlutterwaveWebhookData(
    val id: Long,
    val tx_ref: String,
    val amount: Double,
    val currency: String,
    val status: String,
    val processor_response: String? = null
)

// ============================================================
// RIDE MODELS
// ============================================================

@Serializable
data class RideRequest(
    val destinationId: String? = null,
    val destinationLat: Double? = null,
    val destinationLng: Double? = null,
    val seatsRequested: Int = 1,
    val tripType: String = "standard" // standard or drop
)

@Serializable
data class BoardRideRequest(val tripId: String, val boardingPin: String)

@Serializable
data class NoShowRequest(val tripId: String, val boardingPin: String)

@Serializable
data class PayLinkGenerateRequest(val tripId: String, val amount: Double? = null)

@Serializable
data class PayLinkResponse(
    val qrCodeData: String,
    val driverId: String,
    val fleetNumber: Int,
    val amount: Double
)

@Serializable
data class PayLinkScanRequest(val qrData: String)

@Serializable
data class PayLinkScanResponse(
    val success: Boolean,
    val amount: Double,
    val reference: String,
    val message: String
)

@Serializable
data class RideRequestResponse(
    val tripId: String? = null,
    val boardingPin: String? = null,
    val status: String,
    val totalFare: Double? = null,
    val tripType: String? = null,
    val ticketNumber: Int? = null,
    val studentsAhead: Int? = null,
    val estimatedWaitMinutes: Int? = null,
    val destinationName: String? = null
)

@Serializable
data class RideSummary(
    val id: String,
    val driverName: String,
    val driverFleetNumber: Int,
    val tripType: String,
    val status: String,
    val totalFare: Double,
    val createdAt: String,
    val pickupLat: Double? = null,
    val pickupLng: Double? = null,
    val destinationName: String? = null
)

@Serializable
data class RidePassengerItem(
    val id: String,
    val studentId: String,
    val studentName: String,
    val matricNumber: String,
    val boardingPin: String,
    val boardingStatus: String,
    val paymentStatus: String,
    val farePaid: Double,
    val boardedAt: String? = null
)

@Serializable
data class TripPassengersResponse(
    val passengers: List<RidePassengerItem>,
    val totalPassengers: Int,
    val totalPaid: Double,
    val allPaid: Boolean
)

// ============================================================
// QUEUE MODELS
// ============================================================

@Serializable
data class JoinQueueRequest(
    val destinationId: String,
    val seatsRequested: Int = 1,
    val seats: Int? = null,
    val userId: String? = null
)

@Serializable
data class QueuePositionResponse(
    val ticketNumber: Int,
    val studentsAhead: Int,
    val estimatedWaitMinutes: Int,
    val destinationName: String,
    val status: String
)

@Serializable
data class QueueEntryItem(
    val queueId: String,
    val destinationId: String,
    val destinationName: String,
    val position: Int,
    val estimatedWait: Int, // seconds
    val status: String
)

@Serializable
data class QueueStatusResponse(
    val entries: List<QueueEntryItem>
)

@Serializable
data class CallNextRequest(
    val destinationId: String? = null,
    val driverId: String? = null
)

@Serializable
data class CalledStudentItem(
    val tripId: String,
    val studentId: String,
    val studentName: String,
    val boardingPin: String,
    val ticketNumber: Int,
    val fleetNumber: Int
)

@Serializable
data class CallNextResponse(
    val called: Int,
    val students: List<CalledStudentItem>,
    val fleetNumber: Int
)

// ============================================================
// EMERGENCY MODELS
// ============================================================

@Serializable
data class EmergencyTriggerRequest(
    val studentLat: Double,
    val studentLng: Double,
    val studentPhone: String
)

@Serializable
data class EmergencyTriggerResponse(
    val incidentId: String,
    val status: String,
    val driverName: String,
    val driverFleetNumber: Int
)

@Serializable
data class EmergencyResolveRequest(
    val incidentId: String,
    val driverLat: Double = 6.2500,
    val driverLng: Double = 6.7000
)

@Serializable
data class FlagAbuseRequest(val incidentId: String, val reason: String)

@Serializable
data class EmergencyStatusResponse(
    val incidentId: String,
    val status: String,
    val studentName: String,
    val studentPhone: String,
    val driverName: String?,
    val driverFleetNumber: Int?,
    val driverLat: Double?,
    val driverLng: Double?,
    val studentLat: Double?,
    val studentLng: Double?,
    val createdAt: String? = null
)

// ============================================================
// LOST & FOUND MODELS
// ============================================================

@Serializable
data class ReportLostItemRequest(
    val tripId: String,
    val description: String,
    val category: String = "Other",
    val userId: String? = null
)

@Serializable
data class AdminTriggerLostItemRequest(
    val studentMatric: String,
    val description: String,
    val category: String = "Other"
)

@Serializable
data class LostItemSummary(
    val id: String,
    val studentName: String,
    val driverName: String? = null,
    val fleetNumber: Int? = null,
    val itemDescription: String? = null,
    val description: String? = null,
    val category: String = "Other",
    val status: String,
    val destinationName: String? = null,
    val createdAt: String,
    val updatedAt: String? = null
)

@Serializable
data class LostItemActionResponse(
    val message: String,
    val itemId: String
)

// ============================================================
// REPORT MODELS
// ============================================================

@Serializable
data class CreateReportRequest(
    val targetId: String,
    val targetRole: String,
    val incidentType: String,
    val description: String? = null
)

@Serializable
data class ReportSummary(
    val id: String,
    val reporterName: String,
    val reporterRole: String,
    val targetName: String,
    val targetRole: String,
    val incidentType: String,
    val description: String = "",
    val status: String,
    val createdAt: String
)

@Serializable
data class CreateReportResponse(
    val message: String,
    val reportId: String
)

// ============================================================
// ADMIN MODELS
// ============================================================

@Serializable
data class SuspendDriverRequest(val driverId: String, val reason: String)

@Serializable
data class SuspendStudentRequest(val studentId: String, val reason: String)

@Serializable
data class ApproveBankChangeRequest(val driverId: String)

@Serializable
data class CreditWalletRequest(val userId: String, val amount: Double, val reason: String)

@Serializable
data class AdminAnalyticsResponse(
    val activeKekes: Int,
    val tripsToday: Int,
    val pendingBankApprovals: Int,
    val platformRevenue: Double,
    val pendingActions: PendingActions
)

@Serializable
data class PendingActions(
    val bankChanges: Int,
    val incidentReports: Int,
    val lostItemClaims: Int
)

@Serializable
data class AdminDriverItem(
    val id: String,
    val fullName: String,
    val phone: String,
    val email: String,
    val isSuspended: Boolean,
    val suspensionReason: String,
    val fleetNumber: Int,
    val kekeRegistration: String,
    val maxSeats: Int,
    val currentSeats: Int,
    val driverStatus: String,
    val verificationQrCode: String
)

@Serializable
data class AdminStudentItem(
    val id: String,
    val fullName: String,
    val phone: String,
    val email: String,
    val isSuspended: Boolean,
    val suspensionReason: String,
    val matricNumber: String,
    val department: String,
    val faculty: String,
    val level: String,
    val walletBalance: Double
)

// ============================================================
// MARKETPLACE MODELS
// ============================================================

@Serializable
data class VendorItem(
    val id: String,
    val fullName: String,
    val phone: String = "",
    val email: String = "",
    val category: String = "Campus Food",
    val rating: String = "4.8 ★",
    val location: String = "Campus Center"
)

@Serializable
data class ProductItem(
    val id: String = "",
    val vendorId: String = "",
    val name: String,
    val description: String = "",
    val price: Double,
    val imageUrl: String? = null,
    val isAvailable: Boolean = true
)

@Serializable
data class PlaceOrderRequest(
    val vendorId: String,
    val items: List<OrderItem>,
    val notes: String? = null,
    val dropoffLat: Double? = null,
    val dropoffLng: Double? = null,
    val userId: String? = null
)

@Serializable
data class OrderItem(val productId: String, val quantity: Int)

@Serializable
data class AcceptOrderRequest(val orderId: String)

@Serializable
data class AssignDriverRequest(val orderId: String, val driverId: String)

@Serializable
data class DeliverOrderRequest(val orderId: String, val packagePin: String)

@Serializable
data class OrderSummary(
    val id: String,
    val vendorName: String,
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double,
    val status: String,
    val packagePin: String? = null,
    val driverName: String? = null,
    val createdAt: String
)

// ============================================================
// DEVELOPER & LANDMARK MODELS
// ============================================================

@Serializable
data class AddLandmarkRequest(
    val displayName: String,
    val latitude: Double,
    val longitude: Double,
    val landmarkType: String
)

@Serializable
data class LandmarkResponse(
    val id: String,
    val displayName: String,
    val latitude: Double,
    val longitude: Double,
    val landmarkType: String,
    val isActive: Boolean
)

@Serializable
data class AddLandmarkResponse(
    val message: String,
    val id: String
)

// ============================================================
// DRIVER LOCATION MODELS
// ============================================================

@Serializable
data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val heading: Double? = null,
    val speed: Double? = null
)

@Serializable
data class DriverLocationResponse(
    val driverId: String,
    val fleetNumber: Int,
    val latitude: Double,
    val longitude: Double,
    val heading: Double? = null,
    val speed: Double? = null
)

// ============================================================
// PAYMENT REQUEST MODELS
// ============================================================

@Serializable
data class CreatePaymentRequest(
    val payerId: String,
    val amount: Double,
    val description: String? = null,
    val tripId: String? = null
)

@Serializable
data class PaymentRequestResponse(
    val id: String,
    val requesterId: String,
    val requesterName: String,
    val payerId: String,
    val payerName: String,
    val amount: Double,
    val description: String? = null,
    val status: String,
    val createdAt: String
)

@Serializable
data class CreatePaymentRequestResponse(
    val id: String,
    val status: String
)

@Serializable
data class PaymentRequestAction(val action: String) // "accept" or "deny"

// ============================================================
// NOTIFICATION MODELS
// ============================================================

@Serializable
data class NotificationHistoryItem(
    val id: String,
    val title: String,
    val body: String,
    val data: String? = null,
    val isRead: Boolean,
    val createdAt: String
)

@Serializable
data class UnreadCountResponse(
    val unreadCount: Int
)

// ============================================================
// OFFLINE MODELS
// ============================================================

@Serializable
data class OfflineBoardingPassResponse(
    val boardingPass: String,
    val pin: String,
    val destinationName: String,
    val fleetNumber: Int,
    val fare: Double,
    val expiresAt: Long
)

@Serializable
data class OfflineSyncResponse(
    val results: List<String>,
    val synced: Int
)

// ============================================================
// SECURITY SCAN MODELS
// ============================================================

@Serializable
data class SecurityLookupResponse(
    val id: String,
    val fullName: String,
    val role: String,
    val fleetNumber: Int? = null,
    val status: String? = null,
    val kekeRegistration: String? = null,
    val matricNumber: String? = null,
    val department: String? = null,
    val faculty: String? = null,
    val level: String? = null,
    val isVerified: Boolean = true,
    val isSuspended: Boolean,
    val suspensionReason: String? = null,
    val isCleared: Boolean
)

// ============================================================
// GENERIC RESPONSES
// ============================================================

@Serializable
data class HealthResponse(
    val status: String,
    val version: String,
    val service: String,
    val database: String,
    val timestamp: Long
)

@Serializable
data class SuccessResponse(val message: String, val details: String? = null)

@Serializable
data class ErrorResponse(val error: String, val details: String? = null)
