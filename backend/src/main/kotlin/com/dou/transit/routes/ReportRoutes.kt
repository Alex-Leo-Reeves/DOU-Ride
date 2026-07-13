package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.reportRoutes() {
    route("/api/reports") {

        // ============================================================
        // POST /api/reports/create
        // Security/admin creates an incident report against a user.
        // Inserts into reports table and notifies admin.
        // ============================================================
        post("/create") {
            val req = try { call.receive<CreateReportRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val reporterId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Validate target exists
                val targetStmt = conn.prepareStatement("""
                    SELECT id FROM profiles WHERE id = ?::uuid
                """.trimIndent())
                targetStmt.setString(1, req.targetId)
                val targetRs = targetStmt.executeQuery()

                if (!targetRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Target user not found"))
                }

                val insertStmt = conn.prepareStatement("""
                    INSERT INTO reports (reporter_id, target_id, target_role, incident_type, description, status)
                    VALUES (?::uuid, ?::uuid, ?, ?, ?, 'open')
                    RETURNING id
                """.trimIndent())
                insertStmt.setString(1, reporterId)
                insertStmt.setString(2, req.targetId)
                insertStmt.setString(3, req.targetRole)
                insertStmt.setString(4, req.incidentType)
                insertStmt.setString(5, req.description ?: "")
                val insertRs = insertStmt.executeQuery()
                val reportId = if (insertRs.next()) insertRs.getString("id") else ""

                // Notify admin
                val adminTokenStmt = conn.createStatement().executeQuery("""
                    SELECT token, platform FROM notification_tokens nt
                    JOIN profiles p ON p.id = nt.user_id
                    WHERE p.role = 'admin' AND nt.is_active = true LIMIT 1
                """.trimIndent())
                if (adminTokenStmt.next()) {
                    NotificationService.sendPush(
                        token = adminTokenStmt.getString("token"),
                        title = "📋 New Incident Report",
                        body = "Report type: ${req.incidentType.replace('_', ' ')}",
                        data = mapOf("type" to "new_report", "reportId" to reportId),
                        platform = adminTokenStmt.getString("platform")
                    )
                }

                println("[REPORT] Created: $reportId by $reporterId against ${req.targetId}")
                call.respond(HttpStatusCode.Created, mapOf(
                    "message" to "Report submitted",
                    "reportId" to reportId
                ))
            } catch (e: Exception) {
                println("[REPORT] Create error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to submit report"))
            } finally {
                conn.close()
            }
        }
    }
}
