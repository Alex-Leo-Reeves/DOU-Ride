package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class SecurityLookupRequest(
    val driverId: String? = null,
    val matricNumber: String? = null,
    val rawData: String? = null
)

fun Route.securityRoutes() {
    route("/api/security") {

        // ============================================================
        // POST /api/security/lookup
        // Security gate scanner lookup by driverId, fleet number, matric
        // ============================================================
        post("/lookup") {
            val req = try { call.receive<SecurityLookupRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                val driverId = req.driverId
                val matricNumber = req.matricNumber
                val rawData = req.rawData

                var response: SecurityLookupResponse? = null

                when {
                    driverId != null && !driverId.startsWith("fleet-") -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   dd.fleet_number, dd.driver_status, dd.is_suspended AS driver_suspended,
                                   dd.keke_registration
                            FROM profiles p
                            LEFT JOIN driver_details dd ON dd.user_id = p.id
                            WHERE p.id = ?::uuid AND p.role = 'driver' LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, driverId)
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val isSusp = rs.getBoolean("is_suspended") || rs.getBoolean("driver_suspended")
                            response = SecurityLookupResponse(
                                id = rs.getString("id"),
                                fullName = rs.getString("full_name") ?: "Driver",
                                role = rs.getString("role"),
                                fleetNumber = rs.getInt("fleet_number"),
                                status = rs.getString("driver_status") ?: "idle",
                                kekeRegistration = rs.getString("keke_registration"),
                                isSuspended = isSusp,
                                suspensionReason = rs.getString("suspension_reason"),
                                isCleared = !isSusp
                            )
                        }
                    }

                    driverId != null && driverId.startsWith("fleet-") -> {
                        val fleetNum = driverId.removePrefix("fleet-").toIntOrNull() ?: 101
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   dd.fleet_number, dd.driver_status, dd.is_suspended AS driver_suspended,
                                   dd.keke_registration
                            FROM profiles p
                            JOIN driver_details dd ON dd.user_id = p.id
                            WHERE dd.fleet_number = ? AND p.role = 'driver' LIMIT 1
                        """.trimIndent())
                        stmt.setInt(1, fleetNum)
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val isSusp = rs.getBoolean("is_suspended") || rs.getBoolean("driver_suspended")
                            response = SecurityLookupResponse(
                                id = rs.getString("id"),
                                fullName = rs.getString("full_name") ?: "Driver",
                                role = rs.getString("role"),
                                fleetNumber = rs.getInt("fleet_number"),
                                status = rs.getString("driver_status") ?: "idle",
                                kekeRegistration = rs.getString("keke_registration"),
                                isSuspended = isSusp,
                                suspensionReason = rs.getString("suspension_reason"),
                                isCleared = !isSusp
                            )
                        }
                    }

                    matricNumber != null -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   sd.matric_number, sd.department, sd.faculty, sd.level, sd.is_verified
                            FROM profiles p
                            JOIN student_details sd ON sd.user_id = p.id
                            WHERE sd.matric_number ILIKE ? AND p.role = 'student' LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, "%${matricNumber.trim()}%")
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val isSusp = rs.getBoolean("is_suspended")
                            response = SecurityLookupResponse(
                                id = rs.getString("id"),
                                fullName = rs.getString("full_name") ?: "Student",
                                role = rs.getString("role"),
                                matricNumber = rs.getString("matric_number"),
                                department = rs.getString("department"),
                                faculty = rs.getString("faculty"),
                                level = rs.getString("level"),
                                isVerified = rs.getBoolean("is_verified"),
                                isSuspended = isSusp,
                                suspensionReason = rs.getString("suspension_reason"),
                                isCleared = !isSusp
                            )
                        }
                    }

                    rawData != null -> {
                        val stmt = conn.prepareStatement("""
                            SELECT p.id, p.full_name, p.role, p.is_suspended, p.suspension_reason,
                                   sd.matric_number, sd.department, sd.faculty, sd.level
                            FROM profiles p
                            JOIN student_details sd ON sd.user_id = p.id
                            WHERE sd.matric_number ILIKE ? AND p.role = 'student' LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, "%${rawData.trim()}%")
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val isSusp = rs.getBoolean("is_suspended")
                            response = SecurityLookupResponse(
                                id = rs.getString("id"),
                                fullName = rs.getString("full_name") ?: "Student",
                                role = rs.getString("role"),
                                matricNumber = rs.getString("matric_number"),
                                department = rs.getString("department"),
                                faculty = rs.getString("faculty"),
                                level = rs.getString("level"),
                                isSuspended = isSusp,
                                suspensionReason = rs.getString("suspension_reason"),
                                isCleared = !isSusp
                            )
                        }
                    }
                }

                if (response == null) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
                }

                call.respond(response)
            } catch (e: Exception) {
                println("[SECURITY] Lookup error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Lookup failed", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
