package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.notificationRoutes() {
    route("/api/notifications") {
        // ============================================================
        // POST /api/notifications/register-token
        // Register or update FCM/Web Push token for a user
        // ============================================================
        post("/register-token") {
            val body = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val userId = body["userId"] ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))
            val token = body["token"] ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing token"))
            val platform = body["platform"] ?: "android"

            val conn = DatabaseService.getConnection()
            try {
                // Upsert: deactivate old tokens for this platform, then insert new
                conn.prepareStatement("""
                    UPDATE notification_tokens SET is_active = false
                    WHERE user_id = ?::uuid AND platform = ? AND is_active = true
                """.trimIndent()).apply {
                    setString(1, userId); setString(2, platform); executeUpdate()
                }

                conn.prepareStatement("""
                    INSERT INTO notification_tokens (user_id, token, platform)
                    VALUES (?::uuid, ?, ?)
                    ON CONFLICT (user_id, token) DO UPDATE SET is_active = true, updated_at = now()
                """.trimIndent()).apply {
                    setString(1, userId); setString(2, token); setString(3, platform); executeUpdate()
                }

                // Also update profiles.fcm_token for quick lookups
                conn.prepareStatement("""
                    UPDATE profiles SET fcm_token = ? WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, token); setString(2, userId); executeUpdate()
                }

                println("[NOTIF] Token registered: userId=$userId platform=$platform")
                call.respond(SuccessResponse("Notification token registered"))
            } catch (e: Exception) {
                println("[NOTIF] Token registration error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to register token"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/notifications/send-test
        // Send a test notification to a user (for dev/debugging)
        // ============================================================
        post("/send-test") {
            val body = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val userId = body["userId"] ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true
                    ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("No active notification token found"))
                }

                val token = rs.getString("token")
                val platform = rs.getString("platform")

                val sent = NotificationService.sendPush(
                    token = token,
                    title = "🔔 Test Notification",
                    body = "This is a test notification from DOU Transit. If you see this, push is working!",
                    platform = platform
                )

                if (sent) {
                    call.respond(SuccessResponse("Test notification sent successfully"))
                } else {
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to send test notification"))
                }
            } catch (e: Exception) {
                println("[NOTIF] Test send error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to send test notification"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/notifications/history/{userId}
        // Get notification history for a user
        // ============================================================
        get("/history/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                val stmt = conn.prepareStatement("""
                    SELECT id, title, body, data, is_read, created_at
                    FROM notification_history
                    WHERE user_id = ?::uuid
                    ORDER BY created_at DESC
                    LIMIT ?
                """.trimIndent())
                stmt.setString(1, userId)
                stmt.setInt(2, limit)
                val rs = stmt.executeQuery()

                val notifications = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    notifications.add(mapOf(
                        "id" to rs.getString("id"),
                        "title" to rs.getString("title"),
                        "body" to rs.getString("body"),
                        "data" to rs.getString("data"),
                        "isRead" to rs.getBoolean("is_read"),
                        "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(notifications)
            } catch (e: Exception) {
                println("[NOTIF] History error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch notification history"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/notifications/mark-read/{notificationId}
        // Mark a single notification as read
        // ============================================================
        post("/mark-read/{notificationId}") {
            val notificationId = call.parameters["notificationId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing notificationId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE notification_history SET is_read = true
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, notificationId) }.executeUpdate()

                call.respond(SuccessResponse("Notification marked as read"))
            } catch (e: Exception) {
                println("[NOTIF] Mark read error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark as read"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/notifications/mark-all-read/{userId}
        // Mark all notifications for a user as read
        // ============================================================
        post("/mark-all-read/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE notification_history SET is_read = true
                    WHERE user_id = ?::uuid AND is_read = false
                """.trimIndent()).apply { setString(1, userId) }.executeUpdate()

                call.respond(SuccessResponse("All notifications marked as read"))
            } catch (e: Exception) {
                println("[NOTIF] Mark all read error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark all as read"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/notifications/unread-count/{userId}
        // Get count of unread notifications
        // ============================================================
        get("/unread-count/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT COUNT(*) AS count FROM notification_history
                    WHERE user_id = ?::uuid AND is_read = false
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()
                val count = if (rs.next()) rs.getInt("count") else 0

                call.respond(mapOf("unreadCount" to count))
            } catch (e: Exception) {
                println("[NOTIF] Unread count error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to get unread count"))
            } finally {
                conn.close()
            }
        }
    }
}
