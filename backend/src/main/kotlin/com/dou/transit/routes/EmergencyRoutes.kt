package com.dou.transit.routes

import com.dou.transit.config.AppConfig
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
        // Student triggers emergency. Creates incident, assigns nearest
        // available driver, notifies admin + driver.
        // ============================================================
        post("/trigger") {
            val req = try { call.receive<EmergencyTriggerRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Find an available driver near the student (simple: pick any idle driver)
                val driverStmt = conn.createStatement().executeQuery("""
                    SELECT p.id, p.full_name, dd.fleet_number
                    FROM profiles p
                    JOIN driver_details dd ON dd.user_id = p.id
                    WHERE p.role = 'driver' AND dd.driver_status = 'idle' AND p.is_suspended = false
                    LIMIT 1
                """.trimIndent())

                val driverId: String?
                val driverName: String?
                val fleetNumber: Int?

                if (driverStmt.next()) {
                    driverId = driverStmt.getString("id")
                    driverName = driverStmt.getString("full_name")
                    fleetNumber = driverStmt.getInt("fleet_number")
                } else {
                    driverId = null
                    driverName = null
                    fleetNumber = null
                }

                val incidentId = UUID.randomUUID().toString()

                val insertStmt = conn.prepareStatement("""
                    INSERT INTO emergency_incidents (id, student_id, driver_id, student_lat, student_lng, student_phone, status)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, 'active')
                """.trimIndent())
                insertStmt.setString(1, incidentId)
                insertStmt.setString(2, studentId)
                if (driverId != null) insertStmt.setString(3, driverId)
                else insertStmt.setNull(3, java.sql.Types.OTHER)
                insertStmt.setDouble(4, req.studentLat)
                insertStmt.setDouble(5, req.studentLng)
                insertStmt.setString(6, req.studentPhone)
                insertStmt.executeUpdate()

                // Assign driver to trip if found and update driver status
                if (driverId != null) {
                    // Create an emergency trip
                    val tripId = UUID.randomUUID().toString()
                    conn.prepareStatement("""
                        INSERT INTO trips (id, driver_id, trip_type, status, total_fare, seats_occupied, created_at)
                        VALUES (?::uuid, ?::uuid, 'emergency', 'accepted', 0.00, 1, now())
                    """.trimIndent()).apply {
                        setString(1, tripId); setString(2, driverId); executeUpdate()
                    }

                    conn.prepareStatement("""
                        UPDATE driver_details SET driver_status = 'emergency' WHERE user_id = ?::uuid
                    """.trimIndent()).apply { setString(1, driverId) }.executeUpdate()

                    conn.prepareStatement("""
                        UPDATE emergency_incidents SET status = 'en_route' WHERE id = ?::uuid
                    """.trimIndent()).apply { setString(1, incidentId) }.executeUpdate()

                    // Notify driver
                    val tokenStmt = conn.prepareStatement("""
                        SELECT token, platform FROM notification_tokens
                        WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                    """.trimIndent())
                    tokenStmt.setString(1, driverId)
                    val tokenRs = tokenStmt.executeQuery()
                    if (tokenRs.next()) {
                        NotificationService.sendPush(
                            token = tokenRs.getString("token"),
                            title = "🚨 MEDICAL EMERGENCY",
                            body = "A student needs immediate medical attention. Proceed to their location.",
                            data = mapOf("type" to "emergency_alert", "incidentId" to incidentId,
                                "studentLat" to req.studentLat.toString(), "studentLng" to req.studentLng.toString()),
                            platform = tokenRs.getString("platform")
                        )
                    }
                }

                // Notify admin
                val adminTokenStmt = conn.createStatement().executeQuery("""
                    SELECT token, platform FROM notification_tokens nt
                    JOIN profiles p ON p.id = nt.user_id
                    WHERE p.role = 'admin' AND nt.is_active = true LIMIT 1
                """.trimIndent())
                if (adminTokenStmt.next()) {
                    NotificationService.sendPush(
                        token = adminTokenStmt.getString("token"),
                        title = "🚨 Emergency Alert",
                        body = "Student emergency at (${req.studentLat}, ${req.studentLng}). Driver: ${driverName ?: "Unassigned"}",
                        data = mapOf("type" to "emergency_alert", "incidentId" to incidentId),
                        platform = adminTokenStmt.getString("platform")
                    )
                }

                println("[EMERGENCY] Triggered: $incidentId by student $studentId, driver=$driverId")
                call.respond(HttpStatusCode.Created, mapOf(
                    "incidentId" to incidentId,
                    "status" to if (driverId != null) "en_route" else "active",
                    "driverName" to (driverName ?: ""),
                    "driverFleetNumber" to (fleetNumber ?: 0)
                ))
            } catch (e: Exception) {
                println("[EMERGENCY] Trigger error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to trigger emergency"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/emergency/resolve
        // Driver or admin resolves the emergency. Updates status,
        // releases driver, completes medical trip.
        // ============================================================
        post("/resolve") {
            val req = try { call.receive<EmergencyResolveRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                // Update incident to arrived_medical or resolved
                conn.prepareStatement("""
                    UPDATE emergency_incidents SET status = 'arrived_medical', driver_lat = ?, driver_lng = ?, updated_at = now()
                    WHERE id = ?::uuid AND status IN ('active', 'en_route')
                """.trimIndent()).apply {
                    setDouble(1, req.driverLat); setDouble(2, req.driverLng)
                    setString(3, req.incidentId); executeUpdate()
                }

                // Get the incident info for notifications
                val incStmt = conn.prepareStatement("""
                    SELECT ei.student_id, ei.driver_id, p.full_name AS driver_name, dd.fleet_number
                    FROM emergency_incidents ei
                    LEFT JOIN profiles p ON p.id = ei.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = ei.driver_id
                    WHERE ei.id = ?::uuid
                """.trimIndent())
                incStmt.setString(1, req.incidentId)
                val incRs = incStmt.executeQuery()

                if (incRs.next()) {
                    val studentId = incRs.getString("student_id")
                    val driverId = incRs.getString("driver_id")
                    val driverNameRes = incRs.getString("driver_name") ?: "Driver"
                    val fleetNumberRes = incRs.getInt("fleet_number")

                    // Notify student
                    val studentTokenStmt = conn.prepareStatement("""
                        SELECT token, platform FROM notification_tokens
                        WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                    """.trimIndent())
                    studentTokenStmt.setString(1, studentId)
                    val studentTokenRs = studentTokenStmt.executeQuery()
                    if (studentTokenRs.next()) {
                        NotificationService.sendPush(
                            token = studentTokenRs.getString("token"),
                            title = "✅ Emergency Resolved",
                            body = "$driverNameRes (Fleet #$fleetNumberRes) has arrived at the medical center. You're in safe hands.",
                            data = mapOf("type" to "emergency_resolved", "incidentId" to req.incidentId),
                            platform = studentTokenRs.getString("platform")
                        )
                    }

                    // Release driver
                    if (driverId != null) {
                        conn.prepareStatement("""
                            UPDATE driver_details SET driver_status = 'idle' WHERE user_id = ?::uuid
                        """.trimIndent()).apply { setString(1, driverId) }.executeUpdate()

                        // Close any emergency trip
                        conn.prepareStatement("""
                            UPDATE trips SET status = 'completed', completed_at = now() WHERE driver_id = ?::uuid AND trip_type = 'emergency' AND status IN ('accepted', 'boarding', 'in_progress')
                        """.trimIndent()).apply { setString(1, driverId) }.executeUpdate()
                    }
                }

                // Mark finally resolved
                conn.prepareStatement("""
                    UPDATE emergency_incidents SET status = 'resolved', updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, req.incidentId) }.executeUpdate()

                println("[EMERGENCY] Resolved: ${req.incidentId}")
                call.respond(SuccessResponse("Emergency resolved"))
            } catch (e: Exception) {
                println("[EMERGENCY] Resolve error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to resolve emergency"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/emergency/flag-abuse
        // Admin flags emergency as abuse. Applies ₦5,000 fine,
        // suspends student's ability to trigger emergencies.
        // ============================================================
        post("/flag-abuse") {
            val req = try { call.receive<FlagAbuseRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val adminId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Get student info from incident
                val incStmt = conn.prepareStatement("""
                    SELECT student_id FROM emergency_incidents WHERE id = ?::uuid
                """.trimIndent())
                incStmt.setString(1, req.incidentId)
                val incRs = incStmt.executeQuery()

                if (!incRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Incident not found"))
                }

                val studentId = incRs.getString("student_id")

                // Mark as abuse
                conn.prepareStatement("""
                    UPDATE emergency_incidents SET status = 'abuse_flagged', abuse_reason = ?, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, req.reason); setString(2, req.incidentId); executeUpdate()
                }

                // Apply fine
                val fine = AppConfig.abuseFine
                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, studentId)
                val balRs = balStmt.executeQuery()
                val balance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'penalty', ?, 0.00, ?, ?, 'completed', ?, 'Emergency abuse fine')
                """.trimIndent()).apply {
                    setString(1, studentId); setDouble(2, -fine)
                    setDouble(3, balance); setDouble(4, (balance - fine).coerceAtLeast(0.0))
                    setString(5, "AB-${req.incidentId}-${System.currentTimeMillis()}")
                    executeUpdate()
                }

                // Notify student
                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, studentId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "⚠️ Abuse Flagged",
                        body = "Your emergency trigger has been flagged as abuse. ₦${fine.toInt()} fine applied.",
                        data = mapOf("type" to "abuse_flagged", "incidentId" to req.incidentId),
                        platform = tokenRs.getString("platform")
                    )
                }

                println("[EMERGENCY] Abuse flagged: ${req.incidentId} by $adminId — ${req.reason}")
                call.respond(SuccessResponse("Abuse flagged. ₦${fine.toInt()} fine applied."))
            } catch (e: Exception) {
                println("[EMERGENCY] Flag abuse error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to flag abuse"))
            } finally {
                conn.close()
            }
        }
    }
}
