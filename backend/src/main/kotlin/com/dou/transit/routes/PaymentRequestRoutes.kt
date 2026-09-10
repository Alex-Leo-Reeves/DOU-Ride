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
        // ============================================================
        post("/create") {
            val req = try { call.receive<CreatePaymentRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val requesterId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Amount must be positive"))
            }

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, requesterId)
                DatabaseService.ensureProfileExists(conn, req.payerId)

                val id = UUID.randomUUID().toString()
                conn.prepareStatement("""
                    INSERT INTO payment_requests (id, requester_id, payer_id, amount, description, trip_id, status, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?, ?, ?::uuid, 'pending', now(), now())
                """.trimIndent()).apply {
                    setString(1, id)
                    setString(2, requesterId)
                    setString(3, req.payerId)
                    setDouble(4, req.amount)
                    setString(5, req.description ?: "")
                    if (req.tripId != null && req.tripId.length == 36) setString(6, req.tripId)
                    else setNull(6, java.sql.Types.OTHER)
                    executeUpdate()
                }

                call.respond(HttpStatusCode.Created, CreatePaymentRequestResponse(
                    id = id,
                    status = "pending"
                ))
            } catch (e: Exception) {
                println("[PAY-REQ] Create error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to create payment request", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/payment-requests/incoming/{userId}
        // ============================================================
        get("/incoming/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(emptyList<PaymentRequestResponse>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT pr.id, pr.requester_id, rp.full_name AS requester_name,
                           pr.payer_id, pp.full_name AS payer_name,
                           pr.amount, pr.description, pr.status, pr.created_at
                    FROM payment_requests pr
                    JOIN profiles rp ON rp.id = pr.requester_id
                    JOIN profiles pp ON pp.id = pr.payer_id
                    WHERE pr.payer_id = ?::uuid AND pr.status = 'pending'
                    ORDER BY pr.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()

                val requests = mutableListOf<PaymentRequestResponse>()
                while (rs.next()) {
                    requests.add(PaymentRequestResponse(
                        id = rs.getString("id"),
                        requesterId = rs.getString("requester_id"),
                        requesterName = rs.getString("requester_name") ?: "Friend",
                        payerId = rs.getString("payer_id"),
                        payerName = rs.getString("payer_name") ?: "You",
                        amount = rs.getDouble("amount"),
                        description = rs.getString("description"),
                        status = rs.getString("status"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(requests)
            } catch (e: Exception) {
                call.respond(emptyList<PaymentRequestResponse>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/payment-requests/outgoing/{userId}
        // ============================================================
        get("/outgoing/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(emptyList<PaymentRequestResponse>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT pr.id, pr.requester_id, rp.full_name AS requester_name,
                           pr.payer_id, pp.full_name AS payer_name,
                           pr.amount, pr.description, pr.status, pr.created_at
                    FROM payment_requests pr
                    JOIN profiles rp ON rp.id = pr.requester_id
                    JOIN profiles pp ON pp.id = pr.payer_id
                    WHERE pr.requester_id = ?::uuid
                    ORDER BY pr.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, userId)
                val rs = stmt.executeQuery()

                val requests = mutableListOf<PaymentRequestResponse>()
                while (rs.next()) {
                    requests.add(PaymentRequestResponse(
                        id = rs.getString("id"),
                        requesterId = rs.getString("requester_id"),
                        requesterName = rs.getString("requester_name") ?: "You",
                        payerId = rs.getString("payer_id"),
                        payerName = rs.getString("payer_name") ?: "Friend",
                        amount = rs.getDouble("amount"),
                        description = rs.getString("description"),
                        status = rs.getString("status"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(requests)
            } catch (e: Exception) {
                call.respond(emptyList<PaymentRequestResponse>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/payment-requests/{requestId}/respond
        // ============================================================
        post("/{requestId}/respond") {
            val requestId = call.parameters["requestId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing requestId"))

            val body = try { call.receive<PaymentRequestAction>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body")) }

            val conn = DatabaseService.getConnection()
            try {
                val newStatus = if (body.action == "accept") "accepted" else "denied"
                conn.prepareStatement("UPDATE payment_requests SET status = ?, updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, newStatus); setString(2, requestId); executeUpdate() }

                call.respond(SuccessResponse("Payment request $newStatus"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update request", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
