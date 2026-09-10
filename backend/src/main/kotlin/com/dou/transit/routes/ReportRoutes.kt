package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.reportRoutes() {
    route("/api/reports") {

        // ============================================================
        // POST /api/reports/create
        // Submit an incident report
        // ============================================================
        post("/create") {
            val req = try { call.receive<CreateReportRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val reporterId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, reporterId)
                DatabaseService.ensureProfileExists(conn, req.targetId, role = req.targetRole)

                val reportId = UUID.randomUUID().toString()
                val insertStmt = conn.prepareStatement("""
                    INSERT INTO reports (id, reporter_id, target_id, target_role, incident_type, description, status, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, 'open', now(), now())
                """.trimIndent())
                insertStmt.setString(1, reportId)
                insertStmt.setString(2, reporterId)
                insertStmt.setString(3, req.targetId)
                insertStmt.setString(4, req.targetRole)
                insertStmt.setString(5, req.incidentType)
                insertStmt.setString(6, req.description ?: "")
                insertStmt.executeUpdate()

                call.respond(HttpStatusCode.Created, CreateReportResponse(
                    message = "Report submitted successfully",
                    reportId = reportId
                ))
            } catch (e: Exception) {
                println("[REPORT] Create error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to submit report", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
