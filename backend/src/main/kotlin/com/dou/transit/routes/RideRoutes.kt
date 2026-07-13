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
import kotlinx.serialization.json.Json
import java.util.UUID

fun Route.rideRoutes() {
    route("/api/rides") {

        // ============================================================
        // POST /api/rides/request
        // Request a ride. Returns trip + boarding PIN on direct match,
        // or queue entry if student is within a park geofence.
        // ============================================================
        post("/request") {
            val req = try { call.receive<RideRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Check if student has an active trip (via trip_passengers)
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

                // Determine fare based on trip type
                val fare = when (req.tripType) {
                    "drop" -> AppConfig.dropFare
                    else -> AppConfig.insideCampusFare
                }

                val destinationName: String
                if (req.destinationId != null) {
                    val destStmt = conn.prepareStatement(
                        "SELECT display_name FROM campus_landmarks WHERE id = ?::uuid"
                    )
                    destStmt.setString(1, req.destinationId!!)
                    val destRs = destStmt.executeQuery()
                    destinationName = if (destRs.next()) destRs.getString("display_name") else "Destination"
                } else {
                    destinationName = "Destination"
                }

                if (req.tripType == "drop") {
                    // Drop (charter) mode: create trip directly, no queue
                    val tripId = UUID.randomUUID().toString()
                    val boardingPin = "${1000 + (System.currentTimeMillis() % 9000).toInt()}"

                    val tripStmt = conn.prepareStatement("""
                        INSERT INTO trips (id, trip_type, status, destination_id, destination_name,
                            total_fare, seats_occupied, created_at)
                        VALUES (?::uuid, 'drop', 'requested', ?::uuid, ?, ?, ?, now())
                    """.trimIndent())
                    tripStmt.setString(1, tripId)
                    if (req.destinationId != null) tripStmt.setString(2, req.destinationId!!)
                    else tripStmt.setNull(2, java.sql.Types.OTHER)
                    tripStmt.setString(3, destinationName)
                    tripStmt.setDouble(4, fare)
                    tripStmt.setInt(5, req.seatsRequested)
                    tripStmt.executeUpdate()

                    // Add student as passenger
                    val passStmt = conn.prepareStatement("""
                        INSERT INTO trip_passengers (trip_id, student_id, boarding_pin, fare_paid)
                        VALUES (?::uuid, ?::uuid, ?, ?)
                    """.trimIndent())
                    passStmt.setString(1, tripId)
                    passStmt.setString(2, studentId)
                    passStmt.setString(3, boardingPin)
                    passStmt.setDouble(4, fare)
                    passStmt.executeUpdate()

                    call.respond(HttpStatusCode.Created, mapOf(
                        "tripId" to tripId,
                        "boardingPin" to boardingPin,
                        "status" to "requested",
                        "totalFare" to fare,
                        "tripType" to "drop"
                    ))
                } else {
                    // Standard mode: join virtual queue
                    if (req.destinationId == null) {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Destination required for standard trips"))
                    }

                    // Get next ticket number for this destination
                    val ticketStmt = conn.prepareStatement("""
                        SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_ticket
                        FROM virtual_queue WHERE destination_id = ?::uuid AND status IN ('waiting', 'called')
                    """.trimIndent())
                    ticketStmt.setString(1, req.destinationId!!)
                    val ticketRs = ticketStmt.executeQuery()
                    val nextTicket = if (ticketRs.next()) ticketRs.getInt("next_ticket") else 1

                    // Count students ahead
                    val aheadStmt = conn.prepareStatement("""
                        SELECT COUNT(*) AS ahead FROM virtual_queue
                        WHERE destination_id = ?::uuid AND status = 'waiting' AND ticket_number < ?
                    """.trimIndent())
                    aheadStmt.setString(1, req.destinationId!!)
                    aheadStmt.setInt(2, nextTicket)
                    val aheadRs = aheadStmt.executeQuery()
                    val studentsAhead = if (aheadRs.next()) aheadRs.getInt("ahead") else 0

                    // Create queue entry
                    val queueStmt = conn.prepareStatement("""
                        INSERT INTO virtual_queue (student_id, destination_id, ticket_number, seats_requested, status)
                        VALUES (?::uuid, ?::uuid, ?, ?, 'waiting')
                    """.trimIndent())
                    queueStmt.setString(1, studentId)
                    queueStmt.setString(2, req.destinationId!!)
                    queueStmt.setInt(3, nextTicket)
                    queueStmt.setInt(4, req.seatsRequested)
                    queueStmt.executeUpdate()

                    val estimatedWait = studentsAhead * 2 // ~2 min per student

                    call.respond(HttpStatusCode.Created, mapOf(
                        "status" to "queued",
                        "ticketNumber" to nextTicket,
                        "studentsAhead" to studentsAhead,
                        "estimatedWaitMinutes" to estimatedWait,
                        "destinationName" to destinationName
                    ))
                }
            } catch (e: Exception) {
                println("[RIDES] Request error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to process ride request"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/accept/{tripId}
        // Driver accepts a drop/charter trip
        // ============================================================
        post("/accept/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    UPDATE trips SET driver_id = ?::uuid, status = 'accepted', updated_at = now()
                    WHERE id = ?::uuid AND status = 'requested'
                """.trimIndent())
                stmt.setString(1, driverId)
                stmt.setString(2, tripId)
                val updated = stmt.executeUpdate()

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Trip not found or already accepted"))
                }

                // Update driver status
                val drvStmt = conn.prepareStatement(
                    "UPDATE driver_details SET driver_status = 'en_route' WHERE user_id = ?::uuid"
                )
                drvStmt.setString(1, driverId)
                drvStmt.executeUpdate()

                call.respond(SuccessResponse("Ride accepted"))
            } catch (e: Exception) {
                println("[RIDES] Accept error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to accept ride"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/board
        // 4-digit boarding PIN verification
        // ============================================================
        post("/board") {
            val req = try { call.receive<BoardRideRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    UPDATE trip_passengers
                    SET boarding_status = 'confirmed', boarded_at = now()
                    WHERE trip_id = ?::uuid AND boarding_pin = ? AND boarding_status = 'pending'
                    RETURNING id, student_id
                """.trimIndent())
                stmt.setString(1, req.tripId)
                stmt.setString(2, req.boardingPin)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding PIN"))
                }

                // Update trip status to boarding
                val tripStmt = conn.prepareStatement("""
                    UPDATE trips SET status = 'boarding', updated_at = now()
                    WHERE id = ?::uuid AND status = 'accepted'
                """.trimIndent())
                tripStmt.setString(1, req.tripId)
                tripStmt.executeUpdate()

                call.respond(SuccessResponse("Boarding confirmed"))
            } catch (e: Exception) {
                println("[RIDES] Board error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Boarding failed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/complete/{tripId}
        // Mark trip as completed, handle payments, release driver seats
        // ============================================================
        post("/complete/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    UPDATE trips SET status = 'completed', completed_at = now(), updated_at = now()
                    WHERE id = ?::uuid AND status = 'in_progress'
                """.trimIndent())
                stmt.setString(1, tripId)
                val updated = stmt.executeUpdate()

                if (updated == 0) {
                    // Might already be boarding status — try that too
                    val stmt2 = conn.prepareStatement("""
                        UPDATE trips SET status = 'completed', completed_at = now(), updated_at = now()
                        WHERE id = ?::uuid AND status IN ('boarding', 'in_progress')
                    """.trimIndent())
                    stmt2.setString(1, tripId)
                    stmt2.executeUpdate()
                }

                // Reset driver seats
                val tripInfo = conn.prepareStatement(
                    "SELECT driver_id FROM trips WHERE id = ?::uuid"
                )
                tripInfo.setString(1, tripId)
                val tripRs = tripInfo.executeQuery()
                if (tripRs.next()) {
                    val driverId = tripRs.getString("driver_id")
                    if (driverId != null) {
                        val drvStmt = conn.prepareStatement("""
                            UPDATE driver_details SET driver_status = 'idle', current_seats = 0
                            WHERE user_id = ?::uuid
                        """.trimIndent())
                        drvStmt.setString(1, driverId)
                        drvStmt.executeUpdate()
                    }
                }

                call.respond(SuccessResponse("Ride completed"))
            } catch (e: Exception) {
                println("[RIDES] Complete error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to complete ride"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/no-show
        // Penalty for student who didn't show within 120s
        // ============================================================
        post("/no-show") {
            val req = try { call.receive<BoardRideRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                // Find the passenger
                val passStmt = conn.prepareStatement("""
                    SELECT tp.id, tp.student_id, t.driver_id
                    FROM trip_passengers tp
                    JOIN trips t ON t.id = tp.trip_id
                    WHERE tp.trip_id = ?::uuid AND tp.boarding_pin = ?
                """.trimIndent())
                passStmt.setString(1, req.tripId)
                passStmt.setString(2, req.boardingPin)
                val passRs = passStmt.executeQuery()

                if (passRs.next()) {
                    val studentId = passRs.getString("student_id")
                    val driverId = passRs.getString("driver_id")

                    // Mark passenger as no-show
                    val noShowStmt = conn.prepareStatement("""
                        UPDATE trip_passengers SET boarding_status = 'no_show'
                        WHERE trip_id = ?::uuid AND boarding_pin = ?
                    """.trimIndent())
                    noShowStmt.setString(1, req.tripId)
                    noShowStmt.setString(2, req.boardingPin)
                    noShowStmt.executeUpdate()

                    // Mark trip as no-show
                    val tripStmt = conn.prepareStatement("""
                        UPDATE trips SET status = 'no_show', updated_at = now()
                        WHERE id = ?::uuid AND status = 'boarding'
                    """.trimIndent())
                    tripStmt.setString(1, req.tripId)
                    tripStmt.executeUpdate()

                    // Deduct penalty from student wallet
                    val penalty = AppConfig.noShowPenalty
                    val balStmt = conn.prepareStatement("""
                        SELECT COALESCE(SUM(
                            CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                                 WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                                 ELSE 0 END
                        ), 0.00) AS balance
                        FROM wallet_transactions
                        WHERE user_id = ?::uuid AND status = 'completed'
                    """.trimIndent())
                    balStmt.setString(1, studentId)
                    val balRs = balStmt.executeQuery()
                    val studentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                    val penStmt = conn.prepareStatement("""
                        INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                        VALUES (?::uuid, 'penalty', ?, 0.00, ?, ?, 'completed', ?, 'No-show penalty')
                    """.trimIndent())
                    penStmt.setString(1, studentId)
                    penStmt.setDouble(2, -penalty)
                    penStmt.setDouble(3, studentBalance)
                    penStmt.setDouble(4, studentBalance - penalty)
                    penStmt.setString(5, "NS-${req.tripId}-${System.currentTimeMillis()}")
                    penStmt.executeUpdate()

                    // Credit driver (if assigned)
                    if (driverId != null) {
                        val drvBalStmt = conn.prepareStatement("""
                            SELECT COALESCE(SUM(
                                CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                                     WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                                     ELSE 0 END
                            ), 0.00) AS balance
                            FROM wallet_transactions
                            WHERE user_id = ?::uuid AND status = 'completed'
                        """.trimIndent())
                        drvBalStmt.setString(1, driverId)
                        val drvRs = drvBalStmt.executeQuery()
                        val drvBalance = if (drvRs.next()) drvRs.getDouble("balance") else 0.0

                        val drvPenStmt = conn.prepareStatement("""
                            INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                            VALUES (?::uuid, 'ride_payout', ?, 0.00, ?, ?, 'completed', ?, 'No-show compensation')
                        """.trimIndent())
                        drvPenStmt.setString(1, driverId)
                        drvPenStmt.setDouble(2, penalty)
                        drvPenStmt.setDouble(3, drvBalance)
                        drvPenStmt.setDouble(4, drvBalance + penalty)
                        drvPenStmt.setString(5, "NS-${req.tripId}-drv-${System.currentTimeMillis()}")
                        drvPenStmt.executeUpdate()
                    }

                    // Reset driver seats
                    if (driverId != null) {
                        val drvStmt = conn.prepareStatement("""
                            UPDATE driver_details SET driver_status = 'idle', current_seats = 0
                            WHERE user_id = ?::uuid
                        """.trimIndent())
                        drvStmt.setString(1, driverId)
                        drvStmt.executeUpdate()
                    }
                }

                call.respond(SuccessResponse("No-show penalty applied"))
            } catch (e: Exception) {
                println("[RIDES] No-show error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("No-show processing failed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/pay-link/generate
        // Generate QR code data for a pay link
        // ============================================================
        post("/pay-link/generate") {
            val req = try { call.receive<PayLinkGenerateRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val amount = req.amount ?: AppConfig.dropFare

            val conn = DatabaseService.getConnection()
            try {
                // Get fleet number
                val drvStmt = conn.prepareStatement(
                    "SELECT fleet_number FROM driver_details WHERE user_id = ?::uuid"
                )
                drvStmt.setString(1, driverId)
                val drvRs = drvStmt.executeQuery()
                val fleetNumber = if (drvRs.next()) drvRs.getInt("fleet_number") else 0

                val qrData = """{"driver_id":"$driverId","fleet_number":$fleetNumber,"amount":$amount,"trip_id":"${req.tripId}"}"""

                // Store pay link
                val plStmt = conn.prepareStatement("""
                    INSERT INTO driver_pay_links (driver_id, trip_id, qr_code_data, amount)
                    VALUES (?::uuid, ?::uuid, ?, ?)
                """.trimIndent())
                plStmt.setString(1, driverId)
                plStmt.setString(2, req.tripId)
                plStmt.setString(3, qrData)
                plStmt.setDouble(4, amount)
                plStmt.executeUpdate()

                call.respond(PayLinkResponse(
                    qrCodeData = qrData,
                    driverId = driverId,
                    fleetNumber = fleetNumber,
                    amount = amount
                ))
            } catch (e: Exception) {
                println("[RIDES] Pay-link error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to generate pay link"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/pay-link/scan
        // Student scans QR and pays via wallet (wallet debit)
        // ============================================================
        post("/pay-link/scan") {
            val req = try { call.receive<PayLinkScanRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Find the pay link by QR data
                val plStmt = conn.prepareStatement("""
                    SELECT id, driver_id, amount, trip_id, qr_code_data
                    FROM driver_pay_links WHERE qr_code_data = ? AND is_active = true
                    LIMIT 1
                """.trimIndent())
                plStmt.setString(1, req.qrData)
                val plRs = plStmt.executeQuery()

                if (!plRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Invalid or expired pay link"))
                }

                val driverId = plRs.getString("driver_id")
                val amount = plRs.getDouble("amount")
                val tripId = plRs.getString("trip_id")

                // Check student balance
                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, studentId)
                val balRs = balStmt.executeQuery()
                val studentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                if (studentBalance < amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance"))
                }

                val reference = "PAY-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"

                // Debit student
                val debitStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'ride_payment', ?, 0.00, ?, ?, 'completed', ?, 'Ride payment via pay link')
                """.trimIndent())
                debitStmt.setString(1, studentId)
                debitStmt.setDouble(2, -amount)
                debitStmt.setDouble(3, studentBalance)
                debitStmt.setDouble(4, studentBalance - amount)
                debitStmt.setString(5, reference)
                debitStmt.executeUpdate()

                // Credit driver
                val drvBalStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                drvBalStmt.setString(1, driverId)
                val drvRs = drvBalStmt.executeQuery()
                val driverBalance = if (drvRs.next()) drvRs.getDouble("balance") else 0.0

                val creditStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'ride_payout', ?, 0.00, ?, ?, 'completed', ?, 'Ride payout from pay link')
                """.trimIndent())
                creditStmt.setString(1, driverId)
                creditStmt.setDouble(2, amount)
                creditStmt.setDouble(3, driverBalance)
                creditStmt.setDouble(4, driverBalance + amount)
                creditStmt.setString(5, "${reference}-drv")
                creditStmt.executeUpdate()

                // Deactivate pay link
                val deactStmt = conn.prepareStatement(
                    "UPDATE driver_pay_links SET is_active = false WHERE qr_code_data = ?"
                )
                deactStmt.setString(1, req.qrData)
                deactStmt.executeUpdate()

                // Update trip payment status
                if (tripId != null) {
                    val tripPayStmt = conn.prepareStatement("""
                        UPDATE trip_passengers SET payment_status = 'paid', fare_paid = ?
                        WHERE trip_id = ?::uuid AND student_id = ?::uuid
                    """.trimIndent())
                    tripPayStmt.setDouble(1, amount)
                    tripPayStmt.setString(2, tripId)
                    tripPayStmt.setString(3, studentId)
                    tripPayStmt.executeUpdate()
                }

                call.respond(mapOf("success" to true, "message" to "Payment successful"))
            } catch (e: Exception) {
                println("[RIDES] Pay-link scan error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Payment processing failed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/rides/{tripId}/passengers
        // Get all passengers for a trip with payment status
        // Used by driver to see who has paid
        // ============================================================
        get("/{tripId}/passengers") {
            val tripId = call.parameters["tripId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val userId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT tp.id, tp.student_id, tp.boarding_pin, tp.boarding_status,
                           tp.payment_status, tp.fare_paid, tp.boarded_at,
                           p.full_name AS student_name, p.phone AS student_phone,
                           sd.matric_number
                    FROM trip_passengers tp
                    JOIN profiles p ON p.id = tp.student_id
                    LEFT JOIN student_details sd ON sd.user_id = tp.student_id
                    WHERE tp.trip_id = ?::uuid
                    ORDER BY tp.created_at ASC
                """.trimIndent())
                stmt.setString(1, tripId)
                val rs = stmt.executeQuery()

                val passengers = mutableListOf<Map<String, Any?>>()
                var totalPaid = 0.0
                var allPaid = true

                while (rs.next()) {
                    val paymentStatus = rs.getString("payment_status")
                    val farePaid = rs.getDouble("fare_paid")
                    if (paymentStatus == "paid") totalPaid += farePaid
                    if (paymentStatus != "paid") allPaid = false

                    passengers.add(mapOf(
                        "id" to rs.getString("id"),
                        "studentId" to rs.getString("student_id"),
                        "studentName" to rs.getString("student_name"),
                        "matricNumber" to rs.getString("matric_number") ?: "",
                        "boardingPin" to rs.getString("boarding_pin"),
                        "boardingStatus" to rs.getString("boarding_status"),
                        "paymentStatus" to paymentStatus,
                        "farePaid" to farePaid,
                        "boardedAt" to rs.getTimestamp("boarded_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(mapOf(
                    "passengers" to passengers,
                    "totalPassengers" to passengers.size,
                    "totalPaid" to totalPaid,
                    "allPaid" to allPaid
                ))
            } catch (e: Exception) {
                println("[RIDES] Passengers error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch passengers"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/rides/clear/{tripId}
        // Driver "Clear Ride" — marks all unpaid passengers as no_show
        // (driver waives their fare), completes the trip, resets driver status
        // ============================================================
        post("/clear/{tripId}") {
            val tripId = call.parameters["tripId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                // Verify this driver owns this trip
                val tripStmt = conn.prepareStatement("""
                    SELECT id, status FROM trips WHERE id = ?::uuid AND driver_id = ?::uuid
                """.trimIndent())
                tripStmt.setString(1, tripId)
                tripStmt.setString(2, driverId)
                val tripRs = tripStmt.executeQuery()

                if (!tripRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Trip not found or not assigned to you"))
                }

                val currentStatus = tripRs.getString("status")
                if (currentStatus == "completed" || currentStatus == "no_show" || currentStatus == "cancelled") {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Trip already finalized"))
                }

                // Mark all unpaid passengers as no_show
                val markUnpaidStmt = conn.prepareStatement("""
                    UPDATE trip_passengers
                    SET boarding_status = 'no_show'
                    WHERE trip_id = ?::uuid AND payment_status = 'unpaid'
                """.trimIndent())
                markUnpaidStmt.setString(1, tripId)
                markUnpaidStmt.executeUpdate()

                // Mark paid passengers as completed
                val markPaidStmt = conn.prepareStatement("""
                    UPDATE trip_passengers
                    SET boarding_status = 'confirmed'
                    WHERE trip_id = ?::uuid AND payment_status = 'paid'
                """.trimIndent())
                markPaidStmt.setString(1, tripId)
                markPaidStmt.executeUpdate()

                // Mark trip as completed
                val completeStmt = conn.prepareStatement("""
                    UPDATE trips SET status = 'completed', completed_at = now(), updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent())
                completeStmt.setString(1, tripId)
                completeStmt.executeUpdate()

                // Reset driver status
                val drvStmt = conn.prepareStatement("""
                    UPDATE driver_details SET driver_status = 'idle', current_seats = 0
                    WHERE user_id = ?::uuid
                """.trimIndent())
                drvStmt.setString(1, driverId)
                drvStmt.executeUpdate()

                // Deactivate any active pay links for this trip
                val deactPayStmt = conn.prepareStatement("""
                    UPDATE driver_pay_links SET is_active = false
                    WHERE trip_id = ?::uuid AND is_active = true
                """.trimIndent())
                deactPayStmt.setString(1, tripId)
                deactPayStmt.executeUpdate()

                // Notify unpaid passengers
                val notifStmt = conn.prepareStatement("""
                    SELECT tp.student_id, p.fcm_token
                    FROM trip_passengers tp
                    JOIN profiles p ON p.id = tp.student_id
                    WHERE tp.trip_id = ?::uuid AND tp.payment_status = 'unpaid'
                """.trimIndent())
                notifStmt.setString(1, tripId)
                val notifRs = notifStmt.executeQuery()
                while (notifRs.next()) {
                    val fcmToken = notifRs.getString("fcm_token")
                    if (fcmToken != null) {
                        NotificationService.sendPush(
                            token = fcmToken,
                            title = "🚖 Ride Completed",
                            body = "Your ride has been cleared by the driver. Outstanding fare has been waived.",
                            platform = "android"
                        )
                    }
                }

                call.respond(SuccessResponse("Ride cleared successfully"))
            } catch (e: Exception) {
                println("[RIDES] Clear error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to clear ride"))
            } finally {
                conn.close()
            }
        }
    }
}
