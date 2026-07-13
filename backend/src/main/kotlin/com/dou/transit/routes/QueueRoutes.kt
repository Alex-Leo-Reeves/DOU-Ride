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

fun Route.queueRoutes() {
    route("/api/queue") {

        // POST /api/queue/join
        post("/join") {
            val req = try { call.receive<JoinQueueRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val existingStmt = conn.prepareStatement("""
                    SELECT id FROM virtual_queue
                    WHERE student_id = ?::uuid AND destination_id = ?::uuid AND status = 'waiting'
                    LIMIT 1
                """.trimIndent())
                existingStmt.setString(1, studentId)
                existingStmt.setString(2, req.destinationId)
                if (existingStmt.executeQuery().next()) {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("Already in queue for this destination"))
                }

                val destStmt = conn.prepareStatement("SELECT display_name FROM campus_landmarks WHERE id = ?::uuid")
                destStmt.setString(1, req.destinationId)
                val destRs = destStmt.executeQuery()
                val destinationName = if (destRs.next()) destRs.getString("display_name") else "Unknown"

                val ticketStmt = conn.prepareStatement("""
                    SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_ticket
                    FROM virtual_queue WHERE destination_id = ?::uuid AND status IN ('waiting', 'called')
                """.trimIndent())
                ticketStmt.setString(1, req.destinationId)
                val ticketRs = ticketStmt.executeQuery()
                val nextTicket = if (ticketRs.next()) ticketRs.getInt("next_ticket") else 1

                val aheadStmt = conn.prepareStatement("""
                    SELECT COUNT(*) AS ahead FROM virtual_queue
                    WHERE destination_id = ?::uuid AND status = 'waiting' AND ticket_number < ?
                """.trimIndent())
                aheadStmt.setString(1, req.destinationId)
                aheadStmt.setInt(2, nextTicket)
                val aheadRs = aheadStmt.executeQuery()
                val studentsAhead = if (aheadRs.next()) aheadRs.getInt("ahead") else 0

                val insertStmt = conn.prepareStatement("""
                    INSERT INTO virtual_queue (student_id, destination_id, ticket_number, seats_requested, status)
                    VALUES (?::uuid, ?::uuid, ?, ?, 'waiting')
                """.trimIndent())
                insertStmt.setString(1, studentId)
                insertStmt.setString(2, req.destinationId)
                insertStmt.setInt(3, nextTicket)
                insertStmt.setInt(4, req.seatsRequested)
                insertStmt.executeUpdate()

                call.respond(HttpStatusCode.Created, mapOf(
                    "ticketNumber" to nextTicket,
                    "studentsAhead" to studentsAhead,
                    "estimatedWaitMinutes" to studentsAhead * 2,
                    "destinationName" to destinationName,
                    "status" to "waiting"
                ))
            } catch (e: Exception) {
                println("[QUEUE] Join error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to join queue"))
            } finally {
                conn.close()
            }
        }

        // POST /api/queue/call-next/{destinationId}
        post("/call-next/{destinationId}") {
            val destinationId = call.parameters["destinationId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing destinationId"))

            val _ = try { call.receive<CallNextRequest>() } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body"))
            }

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val destStmt = conn.prepareStatement("SELECT display_name FROM campus_landmarks WHERE id = ?::uuid")
                destStmt.setString(1, destinationId)
                val destRs = destStmt.executeQuery()
                val destinationName = if (destRs.next()) destRs.getString("display_name") else "Unknown"

                val drvStmt = conn.prepareStatement("""
                    SELECT fleet_number, max_seats FROM driver_details WHERE user_id = ?::uuid
                """.trimIndent())
                drvStmt.setString(1, driverId)
                val drvRs = drvStmt.executeQuery()
                if (!drvRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Driver not found"))
                }
                val fleetNumber = drvRs.getInt("fleet_number")
                val maxSeats = drvRs.getInt("max_seats")

                val waitingStmt = conn.prepareStatement("""
                    SELECT vq.id, vq.student_id, vq.ticket_number, vq.seats_requested,
                           p.full_name, p.fcm_token
                    FROM virtual_queue vq
                    JOIN profiles p ON p.id = vq.student_id
                    WHERE vq.destination_id = ?::uuid AND vq.status = 'waiting'
                    ORDER BY vq.ticket_number ASC LIMIT ?
                """.trimIndent())
                waitingStmt.setString(1, destinationId)
                waitingStmt.setInt(2, maxSeats)
                val waitingRs = waitingStmt.executeQuery()

                val calledStudents = mutableListOf<Map<String, Any?>>()
                var seatsUsed = 0

                while (waitingRs.next() && seatsUsed < maxSeats) {
                    val queueId = waitingRs.getString("id")
                    val studentIdVal = waitingRs.getString("student_id")
                    val ticketNumber = waitingRs.getInt("ticket_number")
                    val seats = waitingRs.getInt("seats_requested")
                    val studentName = waitingRs.getString("full_name")
                    val fcmToken = waitingRs.getString("fcm_token")
                    val boardingPin = "${1000 + (System.currentTimeMillis() % 9000).toInt()}"
                    val tripId = UUID.randomUUID().toString()

                    conn.prepareStatement("UPDATE virtual_queue SET status = 'called', called_at = now() WHERE id = ?::uuid")
                        .apply { setString(1, queueId); executeUpdate() }

                    conn.prepareStatement("""
                        INSERT INTO trips (id, driver_id, trip_type, status, destination_id,
                            destination_name, total_fare, seats_occupied, created_at)
                        VALUES (?::uuid, ?::uuid, 'standard', 'accepted', ?::uuid, ?, ?, ?, now())
                    """.trimIndent()).apply {
                        setString(1, tripId); setString(2, driverId); setString(3, destinationId)
                        setString(4, destinationName); setDouble(5, AppConfig.insideCampusFare); setInt(6, seats); executeUpdate()
                    }

                    conn.prepareStatement("""
                        INSERT INTO trip_passengers (trip_id, student_id, boarding_pin, fare_paid)
                        VALUES (?::uuid, ?::uuid, ?, ?)
                    """.trimIndent()).apply {
                        setString(1, tripId); setString(2, studentIdVal)
                        setString(3, boardingPin); setDouble(4, AppConfig.insideCampusFare); executeUpdate()
                    }

                    if (fcmToken != null) {
                        NotificationService.sendPush(token = fcmToken,
                            title = "🎫 Queue Called!",
                            body = "Ticket #$ticketNumber — Keke to $destinationName ready! PIN: $boardingPin",
                            data = mapOf("type" to "queue_called", "tripId" to tripId, "boardingPin" to boardingPin,
                                "ticketNumber" to ticketNumber.toString(), "fleetNumber" to fleetNumber.toString()),
                            platform = "android")
                    }

                    calledStudents.add(mapOf("tripId" to tripId, "studentId" to studentIdVal,
                        "studentName" to studentName, "boardingPin" to boardingPin,
                        "ticketNumber" to ticketNumber, "fleetNumber" to fleetNumber))
                    seatsUsed += seats
                }

                if (calledStudents.isEmpty()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("No students in queue for this destination"))
                }

                conn.prepareStatement("UPDATE driver_details SET driver_status = 'en_route', current_seats = ? WHERE user_id = ?::uuid")
                    .apply { setInt(1, seatsUsed); setString(2, driverId); executeUpdate() }

                call.respond(mapOf("called" to calledStudents.size, "students" to calledStudents, "fleetNumber" to fleetNumber))
            } catch (e: Exception) {
                println("[QUEUE] Call-next error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to call next students"))
            } finally {
                conn.close()
            }
        }

        // GET /api/queue/position/{studentId}
        get("/position/{studentId}") {
            val studentId = call.parameters["studentId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing studentId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT vq.ticket_number, vq.status, vq.destination_id, cl.display_name AS destination_name,
                           (SELECT COUNT(*) FROM virtual_queue vq2 WHERE vq2.destination_id = vq.destination_id
                            AND vq2.status = 'waiting' AND vq2.ticket_number < vq.ticket_number) AS students_ahead
                    FROM virtual_queue vq JOIN campus_landmarks cl ON cl.id = vq.destination_id
                    WHERE vq.student_id = ?::uuid AND vq.status IN ('waiting', 'called')
                    ORDER BY vq.created_at DESC LIMIT 1
                """.trimIndent())
                stmt.setString(1, studentId)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("No active queue entry"))
                }

                call.respond(QueuePositionResponse(
                    ticketNumber = rs.getInt("ticket_number"),
                    studentsAhead = rs.getInt("students_ahead"),
                    estimatedWaitMinutes = rs.getInt("students_ahead") * 2,
                    destinationName = rs.getString("destination_name"),
                    status = rs.getString("status")
                ))
            } catch (e: Exception) {
                println("[QUEUE] Position error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to get position"))
            } finally {
                conn.close()
            }
        }
    }
}
