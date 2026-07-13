package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.securityRoutes() {
    route("/api/security") {

        // ============================================================
        // POST /api/security/lookup
        // Look up a user by driverId (UUID), fleet number, matric number,
        // or raw QR data. Returns profile + suspension status.
        // Used by the security gate scanner.
        // ============================================================
        post("/lookup") {
            val req = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val driverId = req["driverId"]
                val matricNumber = req["matricNumber"]
                val rawData = req["rawData"]

                var result: Map<String, Any?>? = null

                when {
                    // Look up by driver UUID (not a fleet-number prefixed value)
                    driverId != null && !driverId.startsWith("fleet-") -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   dd.fleet_number, dd.driver_status, dd.is_suspended AS driver_suspended,
                                   dd.keke_registration
                            FROM profiles p
                            LEFT JOIN driver_details dd ON dd.user_id = p.id
                            WHERE p.id = ?::uuid AND p.role = 'driver'
                            LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, driverId)
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val isSuspended = rs.getBoolean("is_suspended") || rs.getBoolean("driver_suspended")
                            result = mapOf(
                                "id" to rs.getString("id"),
                                "fullName" to rs.getString("full_name"),
                                "role" to rs.getString("role"),
                                "fleetNumber" to rs.getInt("fleet_number"),
                                "status" to (rs.getString("driver_status") ?: "offline"),
                                "kekeRegistration" to rs.getString("keke_registration") ?: "",
                                "isSuspended" to isSuspended,
                                "suspensionReason" to (rs.getString("suspension_reason") ?: ""),
                                "isCleared" to !isSuspended
                            )
                        }
                    }

                    // Look up by fleet number (prefixed with "fleet-")
                    driverId != null && driverId.startsWith("fleet-") -> {
                        val fleetNum = driverId.removePrefix("fleet-").toIntOrNull()
                        if (fleetNum != null) {
                            val stmt = conn.prepareStatement("""
                                SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                       dd.fleet_number, dd.driver_status, dd.is_suspended AS driver_suspended,
                                       dd.keke_registration
                                FROM profiles p
                                JOIN driver_details dd ON dd.user_id = p.id
                                WHERE dd.fleet_number = ? AND p.role = 'driver'
                                LIMIT 1
                            """.trimIndent())
                            stmt.setInt(1, fleetNum)
                            val rs = stmt.executeQuery()
                            if (rs.next()) {
                                val isSuspended = rs.getBoolean("is_suspended") || rs.getBoolean("driver_suspended")
                                result = mapOf(
                                    "id" to rs.getString("id"),
                                    "fullName" to rs.getString("full_name"),
                                    "role" to rs.getString("role"),
                                    "fleetNumber" to rs.getInt("fleet_number"),
                                    "status" to (rs.getString("driver_status") ?: "offline"),
                                    "kekeRegistration" to rs.getString("keke_registration") ?: "",
                                    "isSuspended" to isSuspended,
                                    "suspensionReason" to (rs.getString("suspension_reason") ?: ""),
                                    "isCleared" to !isSuspended
                                )
                            }
                        }
                    }

                    // Look up by matric number
                    matricNumber != null -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   sd.matric_number, sd.department, sd.faculty, sd.level, sd.is_verified
                            FROM profiles p
                            JOIN student_details sd ON sd.user_id = p.id
                            WHERE sd.matric_number ILIKE ? AND p.role = 'student'
                            LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, "%${matricNumber.trim()}%")
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            result = mapOf(
                                "id" to rs.getString("id"),
                                "fullName" to rs.getString("full_name"),
                                "role" to rs.getString("role"),
                                "matricNumber" to rs.getString("matric_number"),
                                "department" to rs.getString("department") ?: "",
                                "faculty" to rs.getString("faculty") ?: "",
                                "level" to rs.getString("level") ?: "",
                                "isVerified" to rs.getBoolean("is_verified"),
                                "isSuspended" to rs.getBoolean("is_suspended"),
                                "suspensionReason" to (rs.getString("suspension_reason") ?: ""),
                                "isCleared" to !rs.getBoolean("is_suspended")
                            )
                        }
                    }

                    // Raw data — try as a QR payload with embedded matric
                    rawData != null -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   sd.matric_number, sd.department, sd.faculty, sd.level
                            FROM profiles p
                            JOIN student_details sd ON sd.user_id = p.id
                            WHERE sd.matric_number = ? AND p.role = 'student'
                            LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, rawData)
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            result = mapOf(
                                "id" to rs.getString("id"),
                                "fullName" to rs.getString("full_name"),
                                "role" to rs.getString("role"),
                                "matricNumber" to rs.getString("matric_number"),
                                "department" to rs.getString("department") ?: "",
                                "faculty" to rs.getString("faculty") ?: "",
                                "level" to rs.getString("level") ?: "",
                                "isSuspended" to rs.getBoolean("is_suspended"),
                                "suspensionReason" to (rs.getString("suspension_reason") ?: ""),
                                "isCleared" to !rs.getBoolean("is_suspended")
                            )
                        }
                    }
                }

                if (result != null) {
                    call.respond(result)
                } else {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
                }
            } catch (e: Exception) {
                println("[SECURITY] Lookup error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Lookup failed"))
            } finally {
                conn.close()
            }
        }
    }
}
