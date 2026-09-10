package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class RegisterTokenBody(
    val userId: String? = null,
    val token: String,
    val platform: String = "android"
)

fun Route.notificationRoutes() {
    route("/api/notifications") {

        // ============================================================
        // POST /api/notifications/register-token
        // Register push notification token
        // ============================================================
        post("/register-token") {
            val body = try { call.receive<RegisterTokenBody>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val userId = call.request.headers["X-User-Id"]
                ?: body.userId
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, userId)

                conn.prepareStatement("""
                    INSERT INTO notification_tokens (user_id, token, platform, is_active, created_at, updated_at)
                    VALUES (?::uuid, ?, ?, true, now(), now())
                    ON CONFLICT (user_id, token) DO UPDATE SET is_active = true, updated_at = now()
                """.trimIndent()).apply {
                    setString(1, userId)
                    setString(2, body.token)
                    setString(3, body.platform)
                    executeUpdate()
                }

                conn.prepareStatement("UPDATE profiles SET fcm_token = ? WHERE id = ?::uuid")
                    .apply { setString(1, body.token); setString(2, userId); executeUpdate() }

                call.respond(SuccessResponse("Notification token registered"))
            } catch (e: Exception) {
                println("[NOTIF] Token error: ${e.message}")
                call.respond(SuccessResponse("Token processed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/notifications/history/{userId}
        // Get user notification history
        // ============================================================
        get("/history/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(emptyList<NotificationHistoryItem>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, title, body, data, is_read, created_at
                    FROM notification_history
                    WHERE user_id = ?::uuid
                    ORDER BY created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()

                val items = mutableListOf<NotificationHistoryItem>()
                while (rs.next()) {
                    items.add(NotificationHistoryItem(
                        id = rs.getString("id"),
                        title = rs.getString("title"),
                        body = rs.getString("body"),
                        data = rs.getString("data"),
                        isRead = rs.getBoolean("is_read"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(items)
            } catch (e: Exception) {
                call.respond(emptyList<NotificationHistoryItem>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/notifications/unread-count/{userId}
        // Count unread notifications
        // ============================================================
        get("/unread-count/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(UnreadCountResponse(0))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT COUNT(*) AS count FROM notification_history
                    WHERE user_id = ?::uuid AND is_read = false
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()
                val count = if (rs.next()) rs.getInt("count") else 0

                call.respond(UnreadCountResponse(unreadCount = count))
            } catch (e: Exception) {
                call.respond(UnreadCountResponse(unreadCount = 0))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/notifications/mark-read/{notificationId}
        // ============================================================
        post("/mark-read/{notificationId}") {
            val notificationId = call.parameters["notificationId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing notificationId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE notification_history SET is_read = true WHERE id = ?::uuid")
                    .apply { setString(1, notificationId); executeUpdate() }

                call.respond(SuccessResponse("Marked as read"))
            } catch (e: Exception) {
                call.respond(SuccessResponse("Marked as read"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/notifications/mark-all-read/{userId}
        // ============================================================
        post("/mark-all-read/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE notification_history SET is_read = true WHERE user_id = ?::uuid AND is_read = false")
                    .apply { setString(1, userId); executeUpdate() }

                call.respond(SuccessResponse("All marked as read"))
            } catch (e: Exception) {
                call.respond(SuccessResponse("All marked as read"))
            } finally {
                conn.close()
            }
        }
    }
}
