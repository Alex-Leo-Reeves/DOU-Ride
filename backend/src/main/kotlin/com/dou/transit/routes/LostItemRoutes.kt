package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.lostItemRoutes() {
    route("/api/lost") {

        // ============================================================
        // POST /api/lost/report
        // Student reports a lost item on a trip.
        // Creates lost_items record, sends notification to the trip's driver.
        // ============================================================
        post("/report") {
            val req = try { call.receive<ReportLostItemRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Find the trip and its driver
                val tripStmt = conn.prepareStatement("""
                    SELECT t.driver_id, t.destination_name,
                           p.full_name AS driver_name, dd.fleet_number
                    FROM trips t
                    JOIN profiles p ON p.id = t.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = t.driver_id
                    WHERE t.id = ?::uuid
                """.trimIndent())
                tripStmt.setString(1, req.tripId)
                val tripRs = tripStmt.executeQuery()

                val driverId: String?
                val driverName: String?
                val fleetNumber: Int?
                val destinationName: String?

                if (tripRs.next()) {
                    driverId = tripRs.getString("driver_id")
                    driverName = tripRs.getString("driver_name")
                    fleetNumber = tripRs.getInt("fleet_number")
                    destinationName = tripRs.getString("destination_name") ?: "Unknown"
                } else {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Trip not found"))
                }

                // Create lost_items record
                val insertStmt = conn.prepareStatement("""
                    INSERT INTO lost_items (trip_id, student_id, driver_id, description, category, status, created_by)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, 'reported', 'student')
                    RETURNING id
                """.trimIndent())
                insertStmt.setString(1, req.tripId)
                insertStmt.setString(2, studentId)
                insertStmt.setString(3, driverId)
                insertStmt.setString(4, req.description)
                insertStmt.setString(5, req.category)
                val insertRs = insertStmt.executeQuery()
                val itemId = if (insertRs.next()) insertRs.getString("id") else ""

                // Notify the driver
                if (driverId != null) {
                    val tokenStmt = conn.prepareStatement("""
                        SELECT token, platform FROM notification_tokens
                        WHERE user_id = ?::uuid AND is_active = true
                        ORDER BY created_at DESC LIMIT 1
                    """.trimIndent())
                    tokenStmt.setString(1, driverId)
                    val tokenRs = tokenStmt.executeQuery()
                    if (tokenRs.next()) {
                        val notif = NotificationService.Templates.lostItemReported(req.description)
                        NotificationService.sendPush(
                            token = tokenRs.getString("token"),
                            title = "🔍 Lost Item on Trip to $destinationName",
                            body = "Student reported: ${req.description}. Please check your Keke (Fleet #$fleetNumber).",
                            data = mapOf("type" to "lost_item_reported", "itemId" to itemId),
                            platform = tokenRs.getString("platform")
                        )
                    }
                }

                println("[LOST] Item reported: $itemId by student $studentId on trip ${req.tripId}")
                call.respond(HttpStatusCode.Created, mapOf(
                    "message" to "Lost item reported. Driver has been notified.",
                    "itemId" to itemId
                ))
            } catch (e: Exception) {
                println("[LOST] Report error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to report lost item"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/lost/return/{itemId}
        // Driver confirms item was dropped off at Student Affairs.
        // Sends notification to student telling them to collect.
        // ============================================================
        post("/return/{itemId}") {
            val itemId = call.parameters["itemId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing itemId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Update status to dropped_off
                val updateStmt = conn.prepareStatement("""
                    UPDATE lost_items
                    SET status = 'dropped_off', updated_at = now()
                    WHERE id = ?::uuid AND driver_id = ?::uuid AND status = 'reported'
                    RETURNING student_id, description
                """.trimIndent())
                updateStmt.setString(1, itemId)
                updateStmt.setString(2, driverId)
                val updateRs = updateStmt.executeQuery()

                if (!updateRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Lost item not found or already returned"))
                }

                val studentId = updateRs.getString("student_id")
                val itemDescription = updateRs.getString("description")

                // Notify the student
                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true
                    ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, studentId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "📦 Item at Student Affairs",
                        body = "Your lost item ($itemDescription) has been dropped off at the Student Affairs office. Bring your ID to collect.",
                        data = mapOf("type" to "lost_item_dropped", "itemId" to itemId),
                        platform = tokenRs.getString("platform")
                    )
                }

                println("[LOST] Item $itemId dropped at Student Affairs by driver $driverId")
                call.respond(SuccessResponse("Item marked as returned to Student Affairs. Student has been notified."))
            } catch (e: Exception) {
                println("[LOST] Return error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark item returned"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/lost/collect/{itemId}
        // Admin confirms the student has collected the item.
        // ============================================================
        post("/collect/{itemId}") {
            val itemId = call.parameters["itemId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing itemId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE lost_items SET status = 'collected', updated_at = now()
                    WHERE id = ?::uuid AND status IN ('dropped_off', 'reported', 'acknowledged')
                """.trimIndent()).apply { setString(1, itemId) }.executeUpdate()

                println("[LOST] Item $itemId collected by student")
                call.respond(SuccessResponse("Item marked as collected by student"))
            } catch (e: Exception) {
                println("[LOST] Collect error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark item collected"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/lost/admin-trigger
        // Admin creates a lost item claim for a phone-less student.
        // ============================================================
        post("/admin-trigger") {
            val req = try { call.receive<AdminTriggerLostItemRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val adminId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Find student by matric number
                val studentStmt = conn.prepareStatement("""
                    SELECT p.id, p.full_name
                    FROM profiles p
                    JOIN student_details s ON s.user_id = p.id
                    WHERE s.matric_number = ?
                """.trimIndent())
                studentStmt.setString(1, req.studentMatric)
                val studentRs = studentStmt.executeQuery()

                if (!studentRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Student not found with that matric number"))
                }

                val studentId = studentRs.getString("id")
                val studentName = studentRs.getString("full_name")

                // Create lost_items record (no trip associated, created by admin)
                val insertStmt = conn.prepareStatement("""
                    INSERT INTO lost_items (student_id, description, category, status, created_by)
                    VALUES (?::uuid, ?, ?, 'reported', 'admin')
                    RETURNING id
                """.trimIndent())
                insertStmt.setString(1, studentId)
                insertStmt.setString(2, req.description)
                insertStmt.setString(3, req.category)
                val insertRs = insertStmt.executeQuery()
                val itemId = if (insertRs.next()) insertRs.getString("id") else ""

                println("[LOST] Admin $adminId created lost item claim for $studentName ($studentId): $itemId")
                call.respond(HttpStatusCode.Created, mapOf(
                    "message" to "Lost item claim created for $studentName",
                    "itemId" to itemId
                ))
            } catch (e: Exception) {
                println("[LOST] Admin trigger error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create lost item claim"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/lost/my-items
        // Student's own lost items with driver info and status.
        // ============================================================
        get("/my-items") {
            val studentId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT li.id, li.description, li.category, li.status, li.created_at, li.updated_at,
                           dp.full_name AS driver_name, dd.fleet_number, t.destination_name
                    FROM lost_items li
                    LEFT JOIN profiles dp ON dp.id = li.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = li.driver_id
                    LEFT JOIN trips t ON t.id = li.trip_id
                    WHERE li.student_id = ?::uuid AND li.created_by = 'student'
                    ORDER BY li.created_at DESC
                    LIMIT 50
                """.trimIndent())
                stmt.setString(1, studentId)
                val rs = stmt.executeQuery()

                val items = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = rs.getString("id")
                    m["description"] = rs.getString("description")
                    m["category"] = rs.getString("category") ?: "Other"
                    m["status"] = rs.getString("status")
                    m["driverName"] = rs.getString("driver_name") ?: "N/A"
                    m["fleetNumber"] = rs.getInt("fleet_number")
                    m["destinationName"] = rs.getString("destination_name") ?: "N/A"
                    m["createdAt"] = rs.getTimestamp("created_at").toInstant().toString()
                    m["updatedAt"] = rs.getTimestamp("updated_at").toInstant().toString()
                    items.add(m)
                }

                call.respond(items)
            } catch (e: Exception) {
                println("[LOST] My items error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch your lost items"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/lost/driver-items
        // Lost items from trips this driver was involved in.
        // ============================================================
        get("/driver-items") {
            val driverId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT li.id, li.description, li.category, li.status, li.created_at,
                           sp.full_name AS student_name, s.matric_number, t.destination_name
                    FROM lost_items li
                    JOIN profiles sp ON sp.id = li.student_id
                    LEFT JOIN student_details s ON s.user_id = li.student_id
                    LEFT JOIN trips t ON t.id = li.trip_id
                    WHERE li.driver_id = ?::uuid
                    ORDER BY li.created_at DESC
                    LIMIT 50
                """.trimIndent())
                stmt.setString(1, driverId)
                val rs = stmt.executeQuery()

                val items = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = rs.getString("id")
                    m["description"] = rs.getString("description")
                    m["category"] = rs.getString("category") ?: "Other"
                    m["status"] = rs.getString("status")
                    m["studentName"] = rs.getString("student_name")
                    m["matricNumber"] = rs.getString("matric_number") ?: ""
                    m["destinationName"] = rs.getString("destination_name") ?: "N/A"
                    m["createdAt"] = rs.getTimestamp("created_at").toInstant().toString()
                    items.add(m)
                }

                call.respond(items)
            } catch (e: Exception) {
                println("[LOST] Driver items error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch lost items"))
            } finally {
                conn.close()
            }
        }
    }
}
