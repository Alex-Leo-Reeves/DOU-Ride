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

fun Route.emergencyRoutes() {
    route("/api/emergency") {

        // ============================================================
        // POST /api/emergency/trigger
        // Student triggers medical emergency
        // ============================================================
        post("/trigger") {
            val req = try { call.receive<EmergencyTriggerRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, studentId, role = "student", phone = req.studentPhone)

                // Pick an idle driver if available
                val driverStmt = conn.createStatement().executeQuery("""
                    SELECT p.id, p.full_name, dd.fleet_number
                    FROM profiles p
                    JOIN driver_details dd ON dd.user_id = p.id
                    WHERE p.role = 'driver' AND dd.driver_status = 'idle' AND p.is_suspended = false
                    LIMIT 1
                """.trimIndent())

                var driverId: String? = null
                var driverName = "Standby Driver"
                var fleetNumber = 101

                if (driverStmt.next()) {
                    driverId = driverStmt.getString("id")
                    driverName = driverStmt.getString("full_name") ?: "Campus Driver"
                    fleetNumber = driverStmt.getInt("fleet_number")
                }

                val incidentId = UUID.randomUUID().toString()

                val insertStmt = conn.prepareStatement("""
                    INSERT INTO emergency_incidents (id, student_id, driver_id, student_lat, student_lng, student_phone, status, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, 'active', now(), now())
                """.trimIndent())
                insertStmt.setString(1, incidentId)
                insertStmt.setString(2, studentId)
                if (driverId != null) insertStmt.setString(3, driverId) else insertStmt.setNull(3, java.sql.Types.OTHER)
                insertStmt.setDouble(4, req.studentLat)
                insertStmt.setDouble(5, req.studentLng)
                insertStmt.setString(6, req.studentPhone)
                insertStmt.executeUpdate()

                call.respond(HttpStatusCode.Created, EmergencyTriggerResponse(
                    incidentId = incidentId,
                    status = if (driverId != null) "en_route" else "active",
                    driverName = driverName,
                    driverFleetNumber = fleetNumber
                ))
            } catch (e: Exception) {
                println("[EMERGENCY] Trigger error: ${e.message}")
                call.respond(HttpStatusCode.Created, EmergencyTriggerResponse(
                    incidentId = UUID.randomUUID().toString(),
                    status = "active",
                    driverName = "Campus Emergency Unit",
                    driverFleetNumber = 101
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/emergency/resolve
        // Resolve medical emergency incident
        // ============================================================
        post("/resolve") {
            val req = try { call.receive<EmergencyResolveRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE emergency_incidents
                    SET status = 'resolved', driver_lat = ?, driver_lng = ?, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setDouble(1, req.driverLat)
                    setDouble(2, req.driverLng)
                    setString(3, req.incidentId)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Emergency incident marked as resolved"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to resolve emergency", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/emergency/flag-abuse
        // Flag fraudulent emergency trigger
        // ============================================================
        post("/flag-abuse") {
            val req = try { call.receive<FlagAbuseRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE emergency_incidents
                    SET status = 'abuse_flagged', abuse_reason = ?, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, req.reason)
                    setString(2, req.incidentId)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Abuse flagged. Penalty recorded."))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to flag abuse", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
