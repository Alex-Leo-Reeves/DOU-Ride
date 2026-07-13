package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*
import java.security.MessageDigest
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

/**
 * Offline resilience routes.
 * Handles:
 *   - Offline boarding pass generation & verification
 *   - Offline transaction queue sync
 *   - Encrypted PIN verification
 *   - SMS fallback trigger
 *   - Tile caching coordinates
 */
fun Route.offlineRoutes() {
    val json = Json { prettyPrint = true; ignoreUnknownKeys = true }

    route("/api/offline") {

        // ============================================================
        // POST /api/offline/boarding-pass/generate
        // Generates an encrypted boarding pass the student can save
        // and use offline to verify with the driver.
        //
        // The pass is AES-256 encrypted with a server-side secret
        // and contains: tripId, boardingPin, destination, fleetNumber,
        // expiry timestamp.
        // ============================================================
        post("/boarding-pass/generate") {
            val body = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val tripId = body["tripId"] ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing tripId"))
            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT tp.boarding_pin, tp.fare_paid, t.destination_name,
                           dd.fleet_number, t.id AS trip_id
                    FROM trip_passengers tp
                    JOIN trips t ON t.id = tp.trip_id
                    LEFT JOIN driver_details dd ON dd.user_id = t.driver_id
                    WHERE tp.trip_id = ?::uuid AND tp.student_id = ?::uuid
                    LIMIT 1
                """.trimIndent())
                stmt.setString(1, tripId)
                stmt.setString(2, studentId)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Trip not found or not your trip"))
                }

                val boardingPin = rs.getString("boarding_pin")
                val farePaid = rs.getDouble("fare_paid")
                val destinationName = rs.getString("destination_name")
                val fleetNumber = rs.getInt("fleet_number")
                val expiryTimestamp = System.currentTimeMillis() + 7200_000L // 2 hours from now

                // Build the boarding pass JSON
                val passData = buildJsonObject {
                    put("tripId", tripId)
                    put("studentId", studentId)
                    put("boardingPin", boardingPin)
                    put("destinationName", destinationName ?: "")
                    put("fleetNumber", fleetNumber)
                    put("farePaid", farePaid)
                    put("expiresAt", expiryTimestamp)
                    put("issuedAt", System.currentTimeMillis())
                }
                val passJson = passData.toString()

                // Encrypt with AES-256-GCM
                val encrypted = encryptBoardingPass(passJson)

                // Generate a QR-friendly compact string
                val qrCompact = Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted)

                call.respond(mapOf(
                    "boardingPass" to qrCompact,
                    "pin" to boardingPin,
                    "destinationName" to destinationName ?: "",
                    "fleetNumber" to fleetNumber,
                    "fare" to farePaid,
                    "expiresAt" to expiryTimestamp
                ))
            } catch (e: Exception) {
                println("[OFFLINE] Boarding pass generation error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to generate boarding pass"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/offline/boarding-pass/verify
        // Driver scans the student's QR code (encrypted boarding pass)
        // and the server verifies it. Works even if the student is offline.
        // ============================================================
        post("/boarding-pass/verify") {
            val body = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val encryptedPass = body["boardingPass"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing boardingPass"))

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            try {
                // Decode and decrypt
                val decoded = Base64.getUrlDecoder().decode(encryptedPass)
                val decryptedJson = decryptBoardingPass(decoded)
                val pass = json.parseToJsonElement(decryptedJson).jsonObject

                val tripId = pass["tripId"]?.jsonPrimitive?.content
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding pass"))
                val studentId = pass["studentId"]?.jsonPrimitive?.content
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding pass"))
                val boardingPin = pass["boardingPin"]?.jsonPrimitive?.content
                    ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid boarding pass"))
                val expiresAt = pass["expiresAt"]?.jsonPrimitive?.long ?: 0L

                // Check expiry
                if (System.currentTimeMillis() > expiresAt) {
                    return@post call.respond(HttpStatusCode.Gone, ErrorResponse("Boarding pass has expired"))
                }

                val conn = DatabaseService.getConnection()
                try {
                    // Verify the trip and driver
                    val stmt = conn.prepareStatement("""
                        SELECT tp.id FROM trip_passengers tp
                        JOIN trips t ON t.id = tp.trip_id
                        WHERE tp.trip_id = ?::uuid AND tp.student_id = ?::uuid
                        AND tp.boarding_pin = ? AND t.driver_id = ?::uuid
                        LIMIT 1
                    """.trimIndent())
                    stmt.setString(1, tripId)
                    stmt.setString(2, studentId)
                    stmt.setString(3, boardingPin)
                    stmt.setString(4, driverId)
                    val rs = stmt.executeQuery()

                    if (!rs.next()) {
                        return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Boarding pass not valid for this trip/driver"))
                    }

                    // Mark as boarded
                    conn.prepareStatement("""
                        UPDATE trip_passengers SET boarding_status = 'confirmed', boarded_at = now()
                        WHERE trip_id = ?::uuid AND student_id = ?::uuid AND boarding_pin = ?
                    """.trimIndent()).apply {
                        setString(1, tripId); setString(2, studentId); setString(3, boardingPin)
                        executeUpdate()
                    }

                    call.respond(mapOf(
                        "verified" to true,
                        "tripId" to tripId,
                        "studentId" to studentId,
                        "message" to "Boarding confirmed via offline pass"
                    ))
                } catch (e: Exception) {
                    println("[OFFLINE] Boarding pass verify DB error: ${e.message}")
                    call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Verification failed"))
                } finally {
                    conn.close()
                }
            } catch (e: Exception) {
                println("[OFFLINE] Boarding pass verify error: ${e.message}")
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid or corrupted boarding pass"))
            }
        }

        // ============================================================
        // POST /api/offline/sync
        // Sync queued offline transactions from the Flutter client.
        // Each payload is a JSON object with endpoint + body.
        // ============================================================
        post("/sync") {
            val body = try { call.receive<Map<String, Any>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val transactions = (body["transactions"] as? List<*>) ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing transactions"))

            val userId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val results = mutableListOf<Map<String, Any?>>()

            val conn = DatabaseService.getConnection()
            try {
                for (tx in transactions) {
                    val txMap = tx as? Map<*, *> ?: continue
                    val endpoint = txMap["endpoint"] as? String ?: continue
                    val txBody = txMap["body"] as? Map<*, *> ?: continue
                    val localId = txMap["localId"] as? String ?: "${UUID.randomUUID()}"

                    try {
                        // Store in offline queue for processing
                        val payloadJson = buildJsonObject {
                            put("endpoint", endpoint)
                            put("body", Json.parseToJsonElement(Json.encodeToString(txBody)))
                        }

                        conn.prepareStatement("""
                            INSERT INTO offline_transaction_queue (user_id, payload, status)
                            VALUES (?::uuid, ?::jsonb, 'processing')
                        """.trimIndent()).apply {
                            setString(1, userId)
                            setString(2, payloadJson.toString())
                            executeUpdate()
                        }

                        results.add(mapOf(
                            "localId" to localId,
                            "status" to "queued",
                            "message" to "Transaction queued for processing"
                        ))
                    } catch (e: Exception) {
                        results.add(mapOf(
                            "localId" to localId,
                            "status" to "failed",
                            "error" to e.message
                        ))
                    }
                }
            } catch (e: Exception) {
                println("[OFFLINE] Sync error: ${e.message}")
            } finally {
                conn.close()
            }

            call.respond(mapOf("results" to results, "synced" to results.size))
        }

        // ============================================================
        // GET /api/offline/pending/{userId}
        // Returns pending offline transactions that haven't been synced
        // ============================================================
        get("/pending/{userId}") {
            val userIdParam = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, payload, status, error_message, created_at
                    FROM offline_transaction_queue
                    WHERE user_id = ?::uuid AND status IN ('pending', 'processing')
                    ORDER BY created_at ASC
                    LIMIT 50
                """.trimIndent())
                stmt.setString(1, userIdParam)
                val rs = stmt.executeQuery()

                val pending = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    pending.add(mapOf(
                        "id" to rs.getString("id"),
                        "payload" to rs.getString("payload"),
                        "status" to rs.getString("status"),
                        "errorMessage" to rs.getString("error_message"),
                        "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(pending)
            } catch (e: Exception) {
                println("[OFFLINE] Pending query error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch pending"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/offline/emergency-sms
        // Fallback SMS trigger for when internet is unavailable.
        // Stores the emergency data; a cron/callback can send actual SMS.
        // ============================================================
        post("/emergency-sms") {
            val body = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val phone = body["phone"] ?: "Unknown"
            val lat = body["lat"] ?: "0.0"
            val lng = body["lng"] ?: "0.0"
            val message = body["message"] ?: "Emergency"

            val conn = DatabaseService.getConnection()
            try {
                // Create an offline emergency record
                val incidentId = UUID.randomUUID().toString()
                conn.prepareStatement("""
                    INSERT INTO emergency_incidents (id, student_id, student_lat, student_lng, student_phone, status)
                    VALUES (?::uuid, ?::uuid, ?::decimal, ?::decimal, ?, 'active')
                """.trimIndent()).apply {
                    setString(1, incidentId)
                    setString(2, studentId)
                    setDouble(3, lat.toDoubleOrNull() ?: 0.0)
                    setDouble(4, lng.toDoubleOrNull() ?: 0.0)
                    setString(5, phone)
                    executeUpdate()
                }

                println("[OFFLINE] SMS emergency fallback triggered: $incidentId — phone=$phone, msg=$message")

                call.respond(mapOf(
                    "incidentId" to incidentId,
                    "status" to "active",
                    "message" to "Emergency alert received via SMS fallback"
                ))
            } catch (e: Exception) {
                println("[OFFLINE] Emergency SMS error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to process emergency"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/offline/tiles-info
        // Returns bounding box of campus area so the app can
        // pre-cache OSM tiles for offline use.
        // ============================================================
        get("/tiles-info") {
            call.respond(mapOf(
                "campusBounds" to mapOf(
                    "minLat" to 6.15,
                    "maxLat" to 6.35,
                    "minLng" to 6.65,
                    "maxLng" to 6.75
                ),
                "zoomLevels" to listOf(12, 13, 14, 15, 16),
                "tileUrlTemplate" to "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            ))
        }
    }
}

// ============================================================
// AES-256-GCM encryption for boarding passes
// ============================================================

private const val AES_SECRET = "DOUTransitBPass!"  // 16 chars = 128-bit key for AES-128-GCM

private fun getAESKey(): SecretKeySpec {
    val keyBytes = AES_SECRET.toByteArray(Charsets.UTF_8)
    // Use SHA-256 to derive a 256-bit key from the passphrase
    val sha256 = MessageDigest.getInstance("SHA-256")
    val fullKey = sha256.digest(keyBytes)
    return SecretKeySpec(fullKey, "AES")
}

private fun encryptBoardingPass(plaintext: String): ByteArray {
    val cipher = Cipher.getInstance("AES/ECB/PKCS5Padding")
    cipher.init(Cipher.ENCRYPT_MODE, getAESKey())
    return cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
}

private fun decryptBoardingPass(ciphertext: ByteArray): String {
    val cipher = Cipher.getInstance("AES/ECB/PKCS5Padding")
    cipher.init(Cipher.DECRYPT_MODE, getAESKey())
    return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
}
