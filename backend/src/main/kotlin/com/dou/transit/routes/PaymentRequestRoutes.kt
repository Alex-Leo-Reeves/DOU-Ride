package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.*

fun Route.paymentRequestRoutes() {
    route("/api/payment-requests") {

        // ============================================================
        // POST /api/payment-requests/create
        // Requester asks a specific user (payerId) to pay for them
        // ============================================================
        post("/create") {
            val req = try { call.receive<CreatePaymentRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body")) }

            val requesterId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Amount must be positive"))
            }
            if (requesterId == req.payerId) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Cannot request payment from yourself"))
            }

            try {
                DatabaseService.getConnection().use { conn ->
                    val id = UUID.randomUUID()
                    conn.prepareStatement("""
                        INSERT INTO payment_requests (id, requester_id, payer_id, amount, description, trip_id, status)
                        VALUES (?, ?::uuid, ?::uuid, ?, ?, ?::uuid, 'pending')
                    """).apply {
                        setObject(1, id)
                        setString(2, requesterId)
                        setString(3, req.payerId)
                        setDouble(4, req.amount)
                        setString(5, req.description ?: "")
                        if (req.tripId != null) setObject(6, UUID.fromString(req.tripId))
                        else setNull(6, java.sql.Types.OTHER)
                        executeUpdate()
                    }
                    call.respond(HttpStatusCode.Created, mapOf("id" to id.toString(), "status" to "pending"))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create payment request", e.message))
            }
        }

        // ============================================================
        // GET /api/payment-requests/incoming/{userId}
        // Payment requests sent TO this user (they need to accept/deny)
        // ============================================================
        get("/incoming/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            try {
                DatabaseService.getConnection().use { conn ->
                    val rs = conn.prepareStatement("""
                        SELECT pr.id, pr.requester_id, rp.full_name AS requester_name,
                               pr.payer_id, pp.full_name AS payer_name,
                               pr.amount, pr.description, pr.status, pr.created_at
                        FROM payment_requests pr
                        JOIN profiles rp ON rp.id = pr.requester_id
                        JOIN profiles pp ON pp.id = pr.payer_id
                        WHERE pr.payer_id = ?::uuid AND pr.status = 'pending'
                        ORDER BY pr.created_at DESC
                        LIMIT 50
                    """).apply { setString(1, userId) }.executeQuery()

                    val requests = mutableListOf<Map<String, Any?>>()
                    while (rs.next()) {
                        requests.add(mapOf(
                            "id" to rs.getString("id"),
                            "requesterId" to rs.getString("requester_id"),
                            "requesterName" to rs.getString("requester_name"),
                            "payerId" to rs.getString("payer_id"),
                            "payerName" to rs.getString("payer_name"),
                            "amount" to rs.getDouble("amount"),
                            "description" to (rs.getString("description") ?: ""),
                            "status" to rs.getString("status"),
                            "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                        ))
                    }
                    call.respond(requests)
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch requests", e.message))
            }
        }

        // ============================================================
        // GET /api/payment-requests/outgoing/{userId}
        // Payment requests sent BY this user
        // ============================================================
        get("/outgoing/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            try {
                DatabaseService.getConnection().use { conn ->
                    val rs = conn.prepareStatement("""
                        SELECT pr.id, pr.requester_id, rp.full_name AS requester_name,
                               pr.payer_id, pp.full_name AS payer_name,
                               pr.amount, pr.description, pr.status, pr.created_at
                        FROM payment_requests pr
                        JOIN profiles rp ON rp.id = pr.requester_id
                        JOIN profiles pp ON pp.id = pr.payer_id
                        WHERE pr.requester_id = ?::uuid
                        ORDER BY pr.created_at DESC
                        LIMIT 50
                    """).apply { setString(1, userId) }.executeQuery()

                    val requests = mutableListOf<Map<String, Any?>>()
                    while (rs.next()) {
                        requests.add(mapOf(
                            "id" to rs.getString("id"),
                            "requesterId" to rs.getString("requester_id"),
                            "requesterName" to rs.getString("requester_name"),
                            "payerId" to rs.getString("payer_id"),
                            "payerName" to rs.getString("payer_name"),
                            "amount" to rs.getDouble("amount"),
                            "description" to (rs.getString("description") ?: ""),
                            "status" to rs.getString("status"),
                            "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                        ))
                    }
                    call.respond(requests)
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch requests", e.message))
            }
        }

        // ============================================================
        // POST /api/payment-requests/{requestId}/respond
        // Payer accepts or denies a payment request
        // If accepted, performs a wallet transfer from payer to requester
        // ============================================================
        post("/{requestId}/respond") {
            val requestId = call.parameters["requestId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing requestId"))

            val action = try { call.receive<PaymentRequestAction>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body")) }

            if (action.action !in listOf("accept", "deny")) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Action must be 'accept' or 'deny'"))
            }

            val payerId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            try {
                DatabaseService.getConnection().use { conn ->
                    // Verify the request exists, is pending, and belongs to this payer
                    val check = conn.prepareStatement("""
                        SELECT pr.requester_id, pr.payer_id, pr.amount, pr.status
                        FROM payment_requests pr WHERE pr.id = ?::uuid
                    """).apply { setString(1, requestId) }.executeQuery()

                    if (!check.next()) {
                        return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Payment request not found"))
                    }
                    if (check.getString("payer_id") != payerId) {
                        return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Not your payment request to respond to"))
                    }
                    if (check.getString("status") != "pending") {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Request already ${check.getString("status")}"))
                    }

                    val requesterId = check.getString("requester_id")
                    val amount = check.getDouble("amount")

                    if (action.action == "accept") {
                        // Calculate payer's balance
                        val balStmt = conn.prepareStatement("""
                            SELECT COALESCE(SUM(
                                CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                                     WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                                     ELSE 0 END
                            ), 0.00) AS balance
                            FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'
                        """).apply { setString(1, payerId) }
                        val balRs = balStmt.executeQuery()
                        val payerBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                        if (payerBalance < amount) {
                            return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance"))
                        }

                        // Deduct from payer
                        val payerRef = "PAYREQ-${System.currentTimeMillis()}-payer"
                        conn.prepareStatement("""
                            INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                            VALUES (?::uuid, 'transfer_out', ?, 0.00, ?, ?, 'completed', ?, ?, ?::jsonb)
                        """).apply {
                            setString(1, payerId)
                            setDouble(2, amount)
                            setDouble(3, payerBalance)
                            setDouble(4, payerBalance - amount)
                            setString(5, payerRef)
                            setString(6, "Paid payment request #$requestId")
                            setString(7, """{"payment_request_id":"$requestId","type":"outgoing"}""")
                            executeUpdate()
                        }

                        // Calculate requester's balance
                        val reqBalStmt = conn.prepareStatement("""
                            SELECT COALESCE(SUM(
                                CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                                     WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                                     ELSE 0 END
                            ), 0.00) AS balance
                            FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'
                        """).apply { setString(1, requesterId) }
                        val reqBalRs = reqBalStmt.executeQuery()
                        val requesterBalance = if (reqBalRs.next()) reqBalRs.getDouble("balance") else 0.0

                        // Credit requester
                        val reqRef = "PAYREQ-${System.currentTimeMillis()}-req"
                        conn.prepareStatement("""
                            INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                            VALUES (?::uuid, 'transfer_in', ?, 0.00, ?, ?, 'completed', ?, ?, ?::jsonb)
                        """).apply {
                            setString(1, requesterId)
                            setDouble(2, amount)
                            setDouble(3, requesterBalance)
                            setDouble(4, requesterBalance + amount)
                            setString(5, reqRef)
                            setString(6, "Received payment from request #$requestId")
                            setString(7, """{"payment_request_id":"$requestId","type":"incoming"}""")
                            executeUpdate()
                        }
                    }

                    // Update request status
                    val statusCol = if (action.action == "accept") "accepted_at" else "denied_at"
                    conn.prepareStatement("""
                        UPDATE payment_requests SET status = ?, $statusCol = now(), updated_at = now()
                        WHERE id = ?::uuid
                    """).apply {
                        setString(1, if (action.action == "accept") "accepted" else "denied")
                        setString(2, requestId)
                        executeUpdate()
                    }

                    call.respond(mapOf(
                        "id" to requestId,
                        "status" to if (action.action == "accept") "accepted" else "denied"
                    ))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to process request", e.message))
            }
        }
    }
}
