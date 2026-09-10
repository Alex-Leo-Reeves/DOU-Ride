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

fun Route.lostItemRoutes() {
    route("/api/lost") {

        // ============================================================
        // POST /api/lost/report
        // Student reports lost item on a trip
        // ============================================================
        post("/report") {
            val req = try { call.receive<ReportLostItemRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val studentId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, studentId, role = "student")

                // Find trip and driver
                var driverId: String? = null
                val tripStmt = conn.prepareStatement("SELECT driver_id FROM trips WHERE id = ?::uuid LIMIT 1")
                tripStmt.setString(1, req.tripId.takeIf { it.length == 36 } ?: UUID.randomUUID().toString())
                val tripRs = tripStmt.executeQuery()
                if (tripRs.next()) {
                    driverId = tripRs.getString("driver_id")
                }

                val itemId = UUID.randomUUID().toString()
                val insertStmt = conn.prepareStatement("""
                    INSERT INTO lost_items (id, trip_id, student_id, driver_id, description, category, status, created_by, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?::uuid, ?, ?, 'reported', 'student', now(), now())
                """.trimIndent())
                insertStmt.setString(1, itemId)
                if (req.tripId.length == 36) insertStmt.setString(2, req.tripId) else insertStmt.setNull(2, java.sql.Types.OTHER)
                insertStmt.setString(3, studentId)
                if (driverId != null) insertStmt.setString(4, driverId) else insertStmt.setNull(4, java.sql.Types.OTHER)
                insertStmt.setString(5, req.description)
                insertStmt.setString(6, req.category)
                insertStmt.executeUpdate()

                call.respond(HttpStatusCode.Created, LostItemActionResponse(
                    message = "Lost item reported successfully",
                    itemId = itemId
                ))
            } catch (e: Exception) {
                println("[LOST] Report error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to report lost item", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/lost/return/{itemId}
        // Driver confirms item returned/dropped off
        // ============================================================
        post("/return/{itemId}") {
            val itemId = call.parameters["itemId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing itemId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE lost_items SET status = 'dropped_off', updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, itemId)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Item marked as dropped off at Student Affairs"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update status", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/lost/admin-trigger
        // Admin logs a lost item claim
        // ============================================================
        post("/admin-trigger") {
            val req = try { call.receive<AdminTriggerLostItemRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                var studentId = UUID.randomUUID().toString()
                val stmt = conn.prepareStatement("""
                    SELECT p.id FROM profiles p
                    JOIN student_details s ON s.user_id = p.id
                    WHERE s.matric_number ILIKE ? LIMIT 1
                """.trimIndent())
                stmt.setString(1, req.studentMatric.trim())
                val rs = stmt.executeQuery()
                if (rs.next()) {
                    studentId = rs.getString("id")
                } else {
                    DatabaseService.ensureProfileExists(conn, studentId, role = "student", fullName = req.studentMatric)
                }

                val itemId = UUID.randomUUID().toString()
                conn.prepareStatement("""
                    INSERT INTO lost_items (id, student_id, description, category, status, created_by, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?, ?, 'reported', 'admin', now(), now())
                """.trimIndent()).apply {
                    setString(1, itemId)
                    setString(2, studentId)
                    setString(3, req.description)
                    setString(4, req.category)
                    executeUpdate()
                }

                call.respond(HttpStatusCode.Created, LostItemActionResponse(
                    message = "Lost item claim created for ${req.studentMatric}",
                    itemId = itemId
                ))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create claim", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/lost/my-items
        // Student views their lost items
        // ============================================================
        get("/my-items") {
            val studentId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(emptyList<LostItemSummary>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT li.id, li.description, li.category, li.status, li.created_at, li.updated_at,
                           dp.full_name AS driver_name, dd.fleet_number, t.destination_name
                    FROM lost_items li
                    LEFT JOIN profiles dp ON dp.id = li.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = li.driver_id
                    LEFT JOIN trips t ON t.id = li.trip_id
                    WHERE li.student_id = ?::uuid
                    ORDER BY li.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, studentId)
                val rs = stmt.executeQuery()

                val items = mutableListOf<LostItemSummary>()
                while (rs.next()) {
                    items.add(LostItemSummary(
                        id = rs.getString("id"),
                        studentName = "You",
                        driverName = rs.getString("driver_name"),
                        fleetNumber = rs.getInt("fleet_number").takeIf { !rs.wasNull() },
                        itemDescription = rs.getString("description"),
                        description = rs.getString("description"),
                        category = rs.getString("category") ?: "Other",
                        status = rs.getString("status"),
                        destinationName = rs.getString("destination_name"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: "",
                        updatedAt = rs.getTimestamp("updated_at")?.toInstant()?.toString()
                    ))
                }

                call.respond(items)
            } catch (e: Exception) {
                call.respond(emptyList<LostItemSummary>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/lost/driver-items
        // Driver views items found in their keke
        // ============================================================
        get("/driver-items") {
            val driverId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(emptyList<LostItemSummary>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT li.id, li.description, li.category, li.status, li.created_at,
                           sp.full_name AS student_name, t.destination_name
                    FROM lost_items li
                    JOIN profiles sp ON sp.id = li.student_id
                    LEFT JOIN trips t ON t.id = li.trip_id
                    WHERE li.driver_id = ?::uuid
                    ORDER BY li.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, driverId)
                val rs = stmt.executeQuery()

                val items = mutableListOf<LostItemSummary>()
                while (rs.next()) {
                    items.add(LostItemSummary(
                        id = rs.getString("id"),
                        studentName = rs.getString("student_name") ?: "Student",
                        itemDescription = rs.getString("description"),
                        description = rs.getString("description"),
                        category = rs.getString("category") ?: "Other",
                        status = rs.getString("status"),
                        destinationName = rs.getString("destination_name"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(items)
            } catch (e: Exception) {
                call.respond(emptyList<LostItemSummary>())
            } finally {
                conn.close()
            }
        }
    }
}
