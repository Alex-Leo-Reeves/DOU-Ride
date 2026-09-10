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

fun Route.rideRoutes() {
    route("/api/rides") {

        // ============================================================
        // POST /api/rides/request
        // Request a ride (standard or drop charter)
        // ============================================================
        post("/request") {
            val req = try { call.receive<RideRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, studentId, role = "student")

                // Check if student has an active trip
                val activeStmt = conn.prepareStatement("""
                    SELECT tp.id FROM trip_passengers tp
                    JOIN trips t ON t.id = tp.trip_id
                    WHERE tp.student_id = ?::uuid AND t.status IN ('requested','accepted','boarding','in_progress')
                    LIMIT 1
                """.trimIndent())
                activeStmt.setString(1, studentId)
                val activeRs = activeStmt.executeQuery()
                if (activeRs.next()) {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("You already have an active trip"))
                }

                val fare = if (req.tripType == "drop") AppConfig.dropFare else AppConfig.insideCampusFare

                var destinationName = "Campus Landmark"
                if (req.destinationId != null) {
                    val destStmt = conn.prepareStatement("SELECT display_name FROM campus_landmarks WHERE id = ?::uuid")
                    destStmt.setString(1, req.destinationId)
                    val destRs = destStmt.executeQuery()
                    if (destRs.next()) destinationName = destRs.getString("display_name")
                }

                if (req.tripType == "drop") {
                    val tripId = UUID.randomUUID().toString()
                    val boardingPin = "${1000 + (System.currentTimeMillis() % 9000).toInt()}"

                    // Pick an available driver or system driver for drop trip
                    val driverRs = conn.createStatement().executeQuery("""
                        SELECT user_id FROM driver_details WHERE is_suspended = false LIMIT 1
                    """.trimIndent())
                    val assignedDriverId = if (driverRs.next()) driverRs.getString("user_id") else studentId

                    val tripStmt = conn.prepareStatement("""
                        INSERT INTO trips (id, driver_id, trip_type, status, destination_id, destination_name,
                            total_fare, seats_occupied, created_at, updated_at)
                        VALUES (?::uuid, ?::uuid, 'drop', 'requested', ?::uuid, ?, ?, ?, now(), now())
                    """.trimIndent())
                    tripStmt.setString(1, tripId)
                    tripStmt.setString(2, assignedDriverId)
                    if (req.destinationId != null) tripStmt.setString(3, req.destinationId)
                    else tripStmt.setNull(3, java.sql.Types.OTHER)
                    tripStmt.setString(4, destinationName)
                    tripStmt.setDouble(5, fare)
                    tripStmt.setInt(6, req.seatsRequested)
                    tripStmt.executeUpdate()

                    // Add student as passenger
                    conn.prepareStatement("""
                        INSERT INTO trip_passengers (trip_id, student_id, boarding_pin, fare_paid, payment_status, created_at)
                        VALUES (?::uuid, ?::uuid, ?, ?, 'unpaid', now())
                    """.trimIndent()).apply {
                        setString(1, tripId)
                        setString(2, studentId)
                        setString(3, boardingPin)
                        setDouble(4, fare)
                        executeUpdate()
                    }

                    call.respond(HttpStatusCode.Created, RideRequestResponse(
                        tripId = tripId,
                        boardingPin = boardingPin,
                        status = "requested",
                        totalFare = fare,
                        tripType = "drop",
                        destinationName = destinationName
                    ))
                } else {
                    // Standard trip: Join queue
                    val destId = req.destinationId
                        ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Destination required for standard trips"))

                    val ticketStmt = conn.prepareStatement("""
                        SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_ticket
                        FROM virtual_queue WHERE destination_id = ?::uuid AND status IN ('waiting', 'called')
                    """.trimIndent())
                    ticketStmt.setString(1, destId)
                    val ticketRs = ticketStmt.executeQuery()
                    val nextTicket = if (ticketRs.next()) ticketRs.getInt("next_ticket") else 1

                    val aheadStmt = conn.prepareStatement("""
                        SELECT COUNT(*) AS ahead FROM virtual_queue
                        WHERE destination_id = ?::uuid AND status = 'waiting' AND ticket_number < ?
                    """.trimIndent())
                    aheadStmt.setString(1, destId)
                    aheadStmt.setInt(2, nextTicket)
                    val aheadRs = aheadStmt.executeQuery()
                    val studentsAhead = if (aheadRs.next()) aheadRs.getInt("ahead") else 0

                    conn.prepareStatement("""
                        INSERT INTO virtual_queue (student_id, destination_id, ticket_number, seats_requested, status, created_at, updated_at)
                        VALUES (?::uuid, ?::uuid, ?, ?, 'waiting', now(), now())
                    """.trimIndent()).apply {
                        setString(1, studentId)
                        setString(2, destId)
                        setInt(3, nextTicket)
                        setInt(4, req.seatsRequested)
                        executeUpdate()
                    }

                    call.respond(HttpStatusCode.Created, RideRequestResponse(
                        status = "queued",
                        ticketNumber = nextTicket,
                        studentsAhead = studentsAhead,
                        estimatedWaitMinutes = studentsAhead * 2,
                        destinationName = destinationName
                    ))
                }
            } catch (e: Exception) {
                println("[RIDES] Request error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to process ride request", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/accept/{tripId}
        // Driver accepts a drop ride
        // ============================================================
        post("/accept/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE trips SET driver_id = ?::uuid, status = 'accepted', updated_at = now()
                    WHERE id = ?::uuid AND status = 'requested'
                """.trimIndent()).apply {
                    setString(1, driverId)
                    setString(2, tripId)
                    executeUpdate()
                }

                conn.prepareStatement("UPDATE driver_details SET driver_status = 'en_route' WHERE user_id = ?::uuid")
                    .apply { setString(1, driverId); executeUpdate() }

                call.respond(SuccessResponse("Trip accepted"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to accept trip", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/board
        // Driver enters/scans passenger's 4-digit boarding PIN
        // ============================================================
        post("/board") {
            val req = try { call.receive<BoardRideRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, trip_id, student_id FROM trip_passengers
                    WHERE trip_id = ?::uuid AND boarding_pin = ? AND boarding_status = 'pending'
                """.trimIndent())
                stmt.setString(1, req.tripId)
                stmt.setString(2, req.boardingPin)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding PIN"))
                }

                val passengerId = rs.getString("id")
                conn.prepareStatement("""
                    UPDATE trip_passengers SET boarding_status = 'confirmed', boarded_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, passengerId); executeUpdate() }

                conn.prepareStatement("""
                    UPDATE trips SET status = 'in_progress', started_at = now(), updated_at = now()
                    WHERE id = ?::uuid AND status = 'accepted'
                """.trimIndent()).apply { setString(1, req.tripId); executeUpdate() }

                call.respond(SuccessResponse("Passenger boarded successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Boarding failed", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/complete/{tripId}
        // Driver completes trip
        // ============================================================
        post("/complete/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE trips SET status = 'completed', completed_at = now(), updated_at = now()
                    WHERE id = ?::uuid AND driver_id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, tripId)
                    setString(2, driverId)
                    executeUpdate()
                }

                conn.prepareStatement("UPDATE driver_details SET driver_status = 'idle', current_seats = 0 WHERE user_id = ?::uuid")
                    .apply { setString(1, driverId); executeUpdate() }

                call.respond(SuccessResponse("Trip completed"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to complete trip", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/no-show
        // Driver reports no show passenger
        // ============================================================
        post("/no-show") {
            val req = try { call.receive<NoShowRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE trip_passengers SET boarding_status = 'no_show'
                    WHERE trip_id = ?::uuid AND boarding_pin = ?
                """.trimIndent()).apply {
                    setString(1, req.tripId)
                    setString(2, req.boardingPin)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Passenger marked as no show"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark no show", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/pay-link/generate
        // Driver generates payment QR code
        // ============================================================
        post("/pay-link/generate") {
            val req = try { call.receive<PayLinkGenerateRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val drvStmt = conn.prepareStatement("SELECT fleet_number FROM driver_details WHERE user_id = ?::uuid")
                drvStmt.setString(1, driverId)
                val drvRs = drvStmt.executeQuery()
                val fleetNumber = if (drvRs.next()) drvRs.getInt("fleet_number") else 101

                val amount = req.amount ?: AppConfig.insideCampusFare
                val qrData = """{"driverId":"$driverId","fleetNumber":$fleetNumber,"amount":$amount,"tripId":"${req.tripId}"}"""

                conn.prepareStatement("""
                    INSERT INTO driver_pay_links (driver_id, trip_id, qr_code_data, amount, is_active, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?, ?, true, now(), now())
                """.trimIndent()).apply {
                    setString(1, driverId)
                    setString(2, req.tripId)
                    setString(3, qrData)
                    setDouble(4, amount)
                    executeUpdate()
                }

                call.respond(PayLinkResponse(
                    qrCodeData = qrData,
                    driverId = driverId,
                    fleetNumber = fleetNumber,
                    amount = amount
                ))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to generate pay link", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/pay-link/scan
        // Student scans driver's QR code to pay
        // ============================================================
        post("/pay-link/scan") {
            val req = try { call.receive<PayLinkScanRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val ref = "PAY-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"

            call.respond(PayLinkScanResponse(
                success = true,
                amount = AppConfig.insideCampusFare,
                reference = ref,
                message = "Payment of ₦${AppConfig.insideCampusFare.toInt()} completed successfully"
            ))
        }

        // ============================================================
        // GET /api/rides/{tripId}/passengers
        // Get all passengers on a trip
        // ============================================================
        get("/{tripId}/passengers") {
            val tripId = call.parameters["tripId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT tp.id, tp.student_id, tp.boarding_pin, tp.boarding_status,
                           tp.payment_status, tp.fare_paid, tp.boarded_at,
                           p.full_name AS student_name, sd.matric_number
                    FROM trip_passengers tp
                    JOIN profiles p ON p.id = tp.student_id
                    LEFT JOIN student_details sd ON sd.user_id = tp.student_id
                    WHERE tp.trip_id = ?::uuid
                    ORDER BY tp.created_at ASC
                """.trimIndent())
                stmt.setString(1, tripId)
                val rs = stmt.executeQuery()

                val passengers = mutableListOf<RidePassengerItem>()
                var totalPaid = 0.0
                var allPaid = true

                while (rs.next()) {
                    val payStatus = rs.getString("payment_status") ?: "unpaid"
                    val fare = rs.getDouble("fare_paid")
                    if (payStatus == "paid") totalPaid += fare else allPaid = false

                    passengers.add(RidePassengerItem(
                        id = rs.getString("id"),
                        studentId = rs.getString("student_id"),
                        studentName = rs.getString("student_name") ?: "Student",
                        matricNumber = rs.getString("matric_number") ?: "",
                        boardingPin = rs.getString("boarding_pin"),
                        boardingStatus = rs.getString("boarding_status"),
                        paymentStatus = payStatus,
                        farePaid = fare,
                        boardedAt = rs.getTimestamp("boarded_at")?.toInstant()?.toString()
                    ))
                }

                call.respond(TripPassengersResponse(
                    passengers = passengers,
                    totalPassengers = passengers.size,
                    totalPaid = totalPaid,
                    allPaid = allPaid
                ))
            } catch (e: Exception) {
                println("[RIDES] Passengers error: ${e.message}")
                call.respond(TripPassengersResponse(
                    passengers = emptyList(),
                    totalPassengers = 0,
                    totalPaid = 0.0,
                    allPaid = true
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/clear/{tripId}
        // Driver "Clear Ride"
        // ============================================================
        post("/clear/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE trips SET status = 'completed', completed_at = now(), updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, tripId)
                    executeUpdate()
                }

                conn.prepareStatement("""
                    UPDATE driver_details SET driver_status = 'idle', current_seats = 0
                    WHERE user_id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, driverId)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Ride cleared successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to clear ride", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
