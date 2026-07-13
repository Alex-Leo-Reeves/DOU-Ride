package com.dou.transit.services

import com.dou.transit.config.AppConfig
import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.put
import java.io.ByteArrayInputStream

/**
 * Notification dispatch service.
 * Handles Firebase Cloud Messaging (FCM) for Android and Web Push for iOS PWA.
 *
 * Initialization:
 *   FIREBASE_SERVICE_ACCOUNT_JSON environment variable must contain
 *   the full Firebase service account JSON string.
 *   On Render, set this in Environment Variables.
 */
object NotificationService {

    private var isInitialized = false

    /**
     * Initialize Firebase Admin SDK from the service account JSON.
     * Must be called once at application startup.
     */
    fun initialize() {
        if (isInitialized) return

        val serviceAccountJson = AppConfig.firebaseServiceAccountJson
        if (serviceAccountJson.isNullOrBlank()) {
            println("[NOTIF] WARNING: FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled")
            return
        }

        try {
            val credentials = GoogleCredentials.fromStream(ByteArrayInputStream(serviceAccountJson.toByteArray()))
            val options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .setProjectId("dou-ride")
                .build()

            if (FirebaseApp.getApps().none { it.name == FirebaseApp.DEFAULT_APP_NAME }) {
                FirebaseApp.initializeApp(options)
            }
            isInitialized = true
            println("[NOTIF] Firebase Admin SDK initialized successfully")
        } catch (e: Exception) {
            println("[NOTIF] ERROR initializing Firebase Admin SDK: ${e.message}")
        }
    }

    // ============================================================
    // PUBLIC SEND METHODS
    // ============================================================

    /**
     * Send a push notification to a specific FCM token.
     * Automatically selects the correct transport based on platform.
     */
    fun sendPush(
        token: String,
        title: String,
        body: String,
        data: Map<String, String> = emptyMap(),
        platform: String = "android"
    ): Boolean {
        if (!isInitialized) {
            println("[NOTIF] Cannot send — Firebase not initialized")
            return false
        }

        try {
            val message = when (platform) {
                "ios_pwa" -> buildWebPushMessage(token, title, body, data)
                else -> buildAndroidMessage(token, title, body, data)
            }

            val response = FirebaseMessaging.getInstance().send(message)
            println("[NOTIF] Sent to $platform: $response")
            return true
        } catch (e: FirebaseMessagingException) {
            println("[NOTIF] FCM error: ${e.messagingErrorCode} — ${e.message}")
            return false
        } catch (e: Exception) {
            println("[NOTIF] Send error: ${e.message}")
            return false
        }
    }

    /**
     * Send a notification using a topic (broadcast to all subscribers).
     */
    fun sendToTopic(
        topic: String,
        title: String,
        body: String,
        data: Map<String, String> = emptyMap()
    ): Boolean {
        if (!isInitialized) return false

        try {
            val message = Message.builder()
                .setTopic(topic)
                .setNotification(Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .putAllData(data)
                .build()

            val response = FirebaseMessaging.getInstance().send(message)
            println("[NOTIF] Topic '$topic': $response")
            return true
        } catch (e: Exception) {
            println("[NOTIF] Topic error: ${e.message}")
            return false
        }
    }

    /**
     * Send multicast to multiple tokens (up to 500).
     */
    fun sendMulticast(
        tokens: List<String>,
        title: String,
        body: String,
        data: Map<String, String> = emptyMap()
    ): Int {
        if (!isInitialized || tokens.isEmpty()) return 0

        try {
            val message = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build())
                .putAllData(data)
                .build()

            val response = FirebaseMessaging.getInstance().sendEachForMulticast(message)
            println("[NOTIF] Multicast: ${response.successCount} succeeded, ${response.failureCount} failed")
            return response.successCount
        } catch (e: Exception) {
            println("[NOTIF] Multicast error: ${e.message}")
            return 0
        }
    }

    // ============================================================
    // PLATFORM-SPECIFIC BUILDERS
    // ============================================================

    private fun buildAndroidMessage(
        token: String,
        title: String,
        body: String,
        data: Map<String, String>
    ): Message {
        val androidConfig = AndroidConfig.builder()
            .setPriority(AndroidConfig.Priority.HIGH)
            .setNotification(AndroidNotification.builder()
                .setTitle(title)
                .setBody(body)
                .setChannelId("dou_transit_default")
                .setPriority(AndroidNotification.Priority.HIGH)
                .setDefaultSound(true)
                .setDefaultVibrateTimings(true)
                .build())
            .build()

        return Message.builder()
            .setToken(token)
            .setAndroidConfig(androidConfig)
            .putAllData(data)
            .build()
    }

    private fun buildWebPushMessage(
        token: String,
        title: String,
        body: String,
        data: Map<String, String>
    ): Message {
        val webpushConfig = WebpushConfig.builder()
            .setNotification(WebpushNotification.builder()
                .setTitle(title)
                .setBody(body)
                .setIcon("/icons/Icon-192.png")
                .setBadge("/icons/Icon-192.png")
                .setRequireInteraction(true)
                .setTag("dou-transit")
                .build())
            .putAllData(data)
            .build()

        return Message.builder()
            .setToken(token)
            .setWebpushConfig(webpushConfig)
            .putAllData(data)
            .build()
    }

    // ============================================================
    // MESSAGE TEMPLATES
    // ============================================================

    object Templates {

        // ---- RIDE EVENTS ----
        fun rideRequested(driverName: String, fleetNumber: Int) = mapOf(
            "type" to "ride_requested",
            "title" to "🚗 New Ride Request",
            "body" to "$driverName (Fleet #$fleetNumber) has accepted your request. Boarding PIN: use 4-digit code."
        )

        fun boardingConfirmed(destinationName: String) = mapOf(
            "type" to "boarding_confirmed",
            "title" to "✅ Boarding Confirmed",
            "body" to "You've boarded for $destinationName. Enjoy your ride!"
        )

        fun rideCompleted() = mapOf(
            "type" to "ride_completed",
            "title" to "🏁 Ride Complete",
            "body" to "Your ride has ended. Please make sure you've paid via the driver's pay link."
        )

        fun noShowPenaltyApplied(amount: Double) = mapOf(
            "type" to "no_show_penalty",
            "title" to "⚠️ No-Show Penalty",
            "body" to "₦${"%.0f".format(amount)} penalty deducted for missing your ride."
        )

        // ---- QUEUE EVENTS ----
        fun queueCalled(ticketNumber: Int, destinationName: String) = mapOf(
            "type" to "queue_called",
            "title" to "🎫 Queue Called!",
            "body" to "Ticket #$ticketNumber — Your Keke for $destinationName is ready! You have 120 seconds to board."
        )

        fun queuePositionUpdated(position: Int, waitMinutes: Int) = mapOf(
            "type" to "queue_position",
            "title" to "Queue Update",
            "body" to "You're #$position in line. Est. wait: ${waitMinutes}min."
        )

        // ---- PAYMENT EVENTS ----
        fun paymentReceived(amount: Double) = mapOf(
            "type" to "payment_received",
            "title" to "💰 Payment Received",
            "body" to "₦${"%.0f".format(amount)} received for the ride."
        )

        fun walletDeposited(amount: Double, balance: Double) = mapOf(
            "type" to "wallet_deposit",
            "title" to "💰 Wallet Funded",
            "body" to "₦${"%.0f".format(amount)} added to wallet. Balance: ₦${"%.0f".format(balance)}."
        )

        fun walletWithdrawn(amount: Double, balance: Double) = mapOf(
            "type" to "wallet_withdrawal",
            "title" to "🏦 Withdrawal Processed",
            "body" to "₦${"%.0f".format(amount)} withdrawn to bank. Balance: ₦${"%.0f".format(balance)}."
        )

        // ---- EMERGENCY ----
        fun emergencyAlert(driverName: String, fleetNumber: Int) = mapOf(
            "type" to "emergency_alert",
            "title" to "🚨 EMERGENCY!",
            "body" to "$driverName (Fleet #$fleetNumber) is taking you to the medical center. Hold tight!"
        )

        fun emergencyResolved() = mapOf(
            "type" to "emergency_resolved",
            "title" to "✅ Emergency Resolved",
            "body" to "The medical team has been notified. You're in safe hands."
        )

        fun abuseFlagged(amount: Double) = mapOf(
            "type" to "abuse_flagged",
            "title" to "⚠️ Abuse Flagged",
            "body" to "Your emergency trigger has been flagged as abuse. ₦${"%.0f".format(amount)} fine applied."
        )

        // ---- LOST & FOUND ----
        fun lostItemReported(itemDescription: String) = mapOf(
            "type" to "lost_item_reported",
            "title" to "🔍 Lost Item",
            "body" to "Student reported: $itemDescription. Please check your Keke."
        )

        fun lostItemDroppedOff() = mapOf(
            "type" to "lost_item_dropped",
            "title" to "📦 Item at Student Affairs",
            "body" to "Your lost item has been dropped off at the Student Affairs office."
        )

        fun lostItemReadyForCollection() = mapOf(
            "type" to "lost_item_ready",
            "title" to "✅ Item Ready for Collection",
            "body" to "Your lost item is ready at Student Affairs. Come with your ID."
        )

        // ---- MARKETPLACE ----
        fun orderReadyForPickup(vendorName: String) = mapOf(
            "type" to "order_ready",
            "title" to "📋 Order Ready",
            "body" to "$vendorName has marked your order ready for pickup."
        )

        fun orderOutForDelivery(driverName: String, fleetNumber: Int) = mapOf(
            "type" to "order_delivery",
            "title" to "🛵 Out for Delivery",
            "body" to "$driverName (Fleet #$fleetNumber) is delivering your order."
        )

        fun orderDelivered() = mapOf(
            "type" to "order_delivered",
            "title" to "✅ Order Delivered",
            "body" to "Your order has been delivered. Enjoy!"
        )

        // ---- ADMIN ACTIONS ----
        fun accountSuspended(reason: String) = mapOf(
            "type" to "account_suspended",
            "title" to "🚫 Account Suspended",
            "body" to "Your account has been suspended. Reason: $reason. Contact Student Affairs."
        )

        fun accountUnsuspended() = mapOf(
            "type" to "account_unsuspended",
            "title" to "✅ Account Reactivated",
            "body" to "Your account has been reactivated. You can now use the app."
        )

        fun walletCreditedByAdmin(amount: Double, reason: String) = mapOf(
            "type" to "admin_credit",
            "title" to "💰 Wallet Adjustment",
            "body" to "₦${"%.0f".format(amount)} credited by admin. Reason: $reason."
        )

        // ---- DRIVER EVENTS ----
        fun bankChangeApproved() = mapOf(
            "type" to "bank_change_approved",
            "title" to "🏦 Bank Change Approved",
            "body" to "Your bank account change request has been approved by admin."
        )

        fun driverSuspended(reason: String) = mapOf(
            "type" to "driver_suspended",
            "title" to "🚫 Access Revoked",
            "body" to "Your driver access has been suspended. Reason: $reason."
        )
    }
}
