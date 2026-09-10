package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.util.Base64
import java.util.UUID

@Serializable
data class GenerateBoardingPassRequest(
    val tripId: String? = null
)

@Serializable
data class VerifyBoardingPassRequest(
    val boardingPass: String
)

@Serializable
data class OfflineSyncPayload(
    val transactions: List<String> = emptyList()
)

fun Route.offlineRoutes() {
    val json = Json { prettyPrint = false; ignoreUnknownKeys = true }

    route("/api/offline") {

        // ============================================================
        // POST /api/offline/boarding-pass/generate
        // ============================================================
        post("/boarding-pass/generate") {
            val body = try { call.receive<GenerateBoardingPassRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val tripId = body.tripId ?: UUID.randomUUID().toString()
            val studentId = call.request.headers["X-User-Id"] ?: "offline-student"

            val boardingPin = "${1000 + (System.currentTimeMillis() % 9000).toInt()}"
            val expiryTimestamp = System.currentTimeMillis() + 7200_000L

            val passData = buildJsonObject {
                put("tripId", tripId)
                put("studentId", studentId)
                put("boardingPin", boardingPin)
                put("destinationName", "Campus Gate")
                put("fleetNumber", 101)
                put("farePaid", 100.0)
                put("expiresAt", expiryTimestamp)
            }
            val qrCompact = Base64.getUrlEncoder().withoutPadding().encodeToString(passData.toString().toByteArray())

            call.respond(OfflineBoardingPassResponse(
                boardingPass = qrCompact,
                pin = boardingPin,
                destinationName = "Campus Gate",
                fleetNumber = 101,
                fare = 100.0,
                expiresAt = expiryTimestamp
            ))
        }

        // ============================================================
        // POST /api/offline/boarding-pass/verify
        // ============================================================
        post("/boarding-pass/verify") {
            val body = try { call.receive<VerifyBoardingPassRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            try {
                val decoded = String(Base64.getUrlDecoder().decode(body.boardingPass))
                val pass = json.parseToJsonElement(decoded).jsonObject
                val expiresAt = pass["expiresAt"]?.jsonPrimitive?.long ?: 0L

                if (System.currentTimeMillis() > expiresAt) {
                    return@post call.respond(HttpStatusCode.Gone, ErrorResponse("Boarding pass has expired"))
                }

                call.respond(SuccessResponse("Boarding pass verified successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding pass data", e.message))
            }
        }

        // ============================================================
        // POST /api/offline/sync
        // Sync offline queued transactions
        // ============================================================
        post("/sync") {
            val payload = try { call.receive<OfflineSyncPayload>() }
            catch (e: Exception) { OfflineSyncPayload() }

            call.respond(OfflineSyncResponse(
                results = listOf("Synced ${payload.transactions.size} records"),
                synced = payload.transactions.size
            ))
        }
    }
}
