package com.dou.transit.models

import kotlinx.serialization.Serializable
import java.util.UUID

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
    val maxSeats: Int,
    val facePhotoBase64: String,
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

// ============================================================
// WALLET MODELS
// ============================================================

@Serializable
data class DepositRequest(val amount: Double)

@Serializable
data class DepositResponse(val paymentUrl: String, val transactionRef: String)

@Serializable
data class WithdrawRequest(
    val bankCode: String,
    val accountNumber: String,
    val amount: Double,
    val bankName: String? = null
)

@Serializable
data class TransferRequest(val recipientId: String, val amount: Double, val note: String? = null)

@Serializable
data class WalletResponse(val balance: Double, val transactions: List<TransactionSummary>)

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

// ============================================================
// QUEUE MODELS
// ============================================================

@Serializable
data class JoinQueueRequest(val destinationId: String, val seatsRequested: Int = 1)

@Serializable
data class QueuePositionResponse(
    val ticketNumber: Int,
    val studentsAhead: Int,
    val estimatedWaitMinutes: Int,
    val destinationName: String,
    val status: String
)

@Serializable
data class CallNextRequest(val destinationId: String, val driverId: String)

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
data class EmergencyResolveRequest(val incidentId: String, val driverLat: Double, val driverLng: Double)

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
    val studentLng: Double?
)

// ============================================================
// LOST & FOUND MODELS
// ============================================================

@Serializable
data class ReportLostItemRequest(
    val tripId: String,
    val description: String,
    val category: String = "Other"
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
    val driverName: String?,
    val fleetNumber: Int?,
    val itemDescription: String,
    val status: String,
    val createdAt: String
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
    val status: String,
    val createdAt: String
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

// ============================================================
// MARKETPLACE MODELS
// ============================================================

@Serializable
data class ProductItem(val name: String, val description: String, val price: Double, val isAvailable: Boolean = true)

@Serializable
data class PlaceOrderRequest(
    val vendorId: String,
    val items: List<OrderItem>,
    val notes: String? = null,
    val dropoffLat: Double? = null,
    val dropoffLng: Double? = null
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
    val items: List<OrderItem>,
    val totalAmount: Double,
    val status: String,
    val packagePin: String?,
    val driverName: String?,
    val createdAt: String
)

// ============================================================
// DEVELOPER MODELS
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
    val heading: Double?,
    val speed: Double?
)

// ============================================================
// GENERIC RESPONSES
// ============================================================

@Serializable
data class SuccessResponse(val message: String, val data: kotlinx.serialization.json.JsonElement? = null)

@Serializable
data class ErrorResponse(val error: String, val details: String? = null)
