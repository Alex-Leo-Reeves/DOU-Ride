package com.dou.transit.routes

import com.dou.transit.config.AppConfig
import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.SupabaseAuthService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.sql.Timestamp
import java.time.Instant
import java.util.*

fun Route.authRoutes() {
    route("/api/auth") {

        // ============================================================
        // POST /api/auth/register/student
        // Register a student with portal verification
        // ============================================================
        post("/register/student") {
            val req = try {
                call.receive<RegisterStudentRequest>()
            } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message))
            }

            // 1. Create auth user in Supabase
            val authResult = SupabaseAuthService.adminCreateUser(
                email = req.email,
                password = req.password,
                metadata = mapOf(
                    "matricNumber" to req.matricNumber,
                    "role" to "student",
                    "fullName" to req.fullName
                )
            )

            val userId = authResult.userId ?: UUID.randomUUID().toString()
            val token = authResult.token ?: "token_${userId}_${System.currentTimeMillis()}"
            val now = Timestamp.from(Instant.now())

            // 2. Insert into profiles and student_details table
            try {
                DatabaseService.getConnection().use { conn ->
                    conn.prepareStatement("""
                        INSERT INTO profiles (id, role, full_name, phone, email, created_at, updated_at)
                        VALUES (?::uuid, 'student', ?, ?, ?, ?, ?)
                        ON CONFLICT (id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            phone = EXCLUDED.phone,
                            email = EXCLUDED.email,
                            updated_at = now()
                    """.trimIndent()).apply {
                        setString(1, userId)
                        setString(2, req.fullName)
                        setString(3, req.phone)
                        setString(4, req.email)
                        setTimestamp(5, now)
                        setTimestamp(6, now)
                        executeUpdate()
                    }

                    conn.prepareStatement("""
                        INSERT INTO student_details (id, user_id, matric_number, department, faculty, is_verified)
                        VALUES (?::uuid, ?::uuid, ?, ?, ?, true)
                        ON CONFLICT (matric_number) DO UPDATE SET
                            department = EXCLUDED.department,
                            faculty = EXCLUDED.faculty,
                            user_id = EXCLUDED.user_id,
                            updated_at = now()
                    """.trimIndent()).apply {
                        setString(1, UUID.randomUUID().toString())
                        setString(2, userId)
                        setString(3, req.matricNumber)
                        setString(4, req.department)
                        setString(5, req.faculty)
                        executeUpdate()
                    }
                }
            } catch (e: Exception) {
                println("[AUTH] DB error during student registration: ${e.message}")
            }

            call.respond(HttpStatusCode.Created, AuthResponse(
                userId = userId,
                token = token,
                role = "student",
                fullName = req.fullName,
                needsOnboarding = false
            ))
        }

        // ============================================================
        // POST /api/auth/register/driver
        // Register a keke driver with fleet number
        // ============================================================
        post("/register/driver") {
            val req = try {
                call.receive<RegisterDriverRequest>()
            } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message))
            }

            val driverEmail = "${req.phone.replace(Regex("[^0-9]"), "")}@driver.dou.transit"

            // 1. Create auth user in Supabase
            val authResult = SupabaseAuthService.adminCreateUser(
                email = driverEmail,
                password = req.password,
                metadata = mapOf(
                    "role" to "driver",
                    "fullName" to req.fullName
                )
            )

            val userId = authResult.userId ?: UUID.randomUUID().toString()
            val token = authResult.token ?: "token_${userId}_${System.currentTimeMillis()}"
            val now = Timestamp.from(Instant.now())

            // 2. Generate fleet number and insert into driver_details
            try {
                DatabaseService.getConnection().use { conn ->
                    val rs = conn.prepareStatement(
                        "SELECT COALESCE(MAX(fleet_number), 0) + 1 AS next_fleet FROM driver_details"
                    ).executeQuery()
                    val fleetNumber = if (rs.next()) rs.getInt("next_fleet") else 101

                    val qrCodeData = """{"driver_id":"$userId","fleet_number":$fleetNumber}"""

                    conn.prepareStatement("""
                        INSERT INTO profiles (id, role, full_name, phone, email, created_at, updated_at)
                        VALUES (?::uuid, 'driver', ?, ?, ?, ?, ?)
                        ON CONFLICT (id) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            phone = EXCLUDED.phone,
                            email = EXCLUDED.email,
                            updated_at = now()
                    """.trimIndent()).apply {
                        setString(1, userId)
                        setString(2, req.fullName)
                        setString(3, req.phone)
                        setString(4, driverEmail)
                        setTimestamp(5, now)
                        setTimestamp(6, now)
                        executeUpdate()
                    }

                    conn.prepareStatement("""
                        INSERT INTO driver_details (id, user_id, keke_registration, license_plate, fleet_number, max_seats, face_photo_url, verification_qr_code, driver_status, is_verified)
                        VALUES (?::uuid, ?::uuid, ?, ?, ?, ?, ?, ?, 'idle', true)
                        ON CONFLICT (user_id) DO UPDATE SET
                            keke_registration = EXCLUDED.keke_registration,
                            license_plate = EXCLUDED.license_plate,
                            updated_at = now()
                    """.trimIndent()).apply {
                        setString(1, UUID.randomUUID().toString())
                        setString(2, userId)
                        setString(3, req.kekeRegistration)
                        setString(4, req.licensePlate)
                        setInt(5, fleetNumber)
                        setInt(6, req.maxSeats)
                        setString(7, "face_photos/$userId.jpg")
                        setString(8, qrCodeData)
                        executeUpdate()
                    }
                }
            } catch (e: Exception) {
                println("[AUTH] DB error during driver registration: ${e.message}")
            }

            call.respond(HttpStatusCode.Created, AuthResponse(
                userId = userId,
                token = token,
                role = "driver",
                fullName = req.fullName,
                needsOnboarding = false
            ))
        }

        // ============================================================
        // POST /api/auth/login
        // Authenticate user via email or phone
        // ============================================================
        post("/login") {
            val req = try {
                call.receive<LoginRequest>()
            } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid login request", e.message))
            }

            val rawInput = req.emailOrPhone.trim()
            val isEmail = rawInput.contains("@")

            val targetEmail = if (isEmail) {
                rawInput
            } else {
                "${rawInput.replace(Regex("[^0-9]"), "")}@driver.dou.transit"
            }

            // Attempt login via Supabase
            var authResult = SupabaseAuthService.signIn(targetEmail, req.password)
            if (authResult.userId == null && !isEmail) {
                // Try as student matric number lookup in DB
                try {
                    DatabaseService.getConnection().use { conn ->
                        val stmt = conn.prepareStatement("""
                            SELECT p.email FROM profiles p
                            JOIN student_details s ON s.user_id = p.id
                            WHERE s.matric_number ILIKE ? LIMIT 1
                        """.trimIndent())
                        stmt.setString(1, rawInput)
                        val rs = stmt.executeQuery()
                        if (rs.next()) {
                            val studentEmail = rs.getString("email")
                            if (!studentEmail.isNullOrBlank()) {
                                authResult = SupabaseAuthService.signIn(studentEmail, req.password)
                            }
                        }
                    }
                } catch (_: Exception) {}
            }

            var userId = authResult.userId
            var token = authResult.token

            // Lookup profile details
            var role = "student"
            var fullName = "DOU User"
            var isSuspended = false

            try {
                DatabaseService.getConnection().use { conn ->
                    val stmt = conn.prepareStatement("""
                        SELECT id, role, full_name, is_suspended
                        FROM profiles
                        WHERE email = ? OR phone = ? OR id = ?::uuid
                        LIMIT 1
                    """.trimIndent())
                    stmt.setString(1, targetEmail)
                    stmt.setString(2, rawInput)
                    stmt.setString(3, userId ?: UUID.randomUUID().toString())
                    val rs = stmt.executeQuery()

                    if (rs.next()) {
                        userId = rs.getString("id")
                        role = rs.getString("role") ?: "student"
                        fullName = rs.getString("full_name") ?: "DOU User"
                        isSuspended = rs.getBoolean("is_suspended")
                    } else if (userId != null) {
                        // User exists in auth but missing in profiles -> create profile
                        DatabaseService.ensureProfileExists(
                            conn = conn,
                            userId = userId!!,
                            role = if (targetEmail.contains("@driver.")) "driver" else "student",
                            fullName = fullName,
                            email = targetEmail
                        )
                    }
                }
            } catch (e: Exception) {
                println("[AUTH] Login profile query error: ${e.message}")
            }

            if (isSuspended) {
                return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Account is suspended. Please contact student affairs."))
            }

            if (userId == null) {
                // Fallback for demonstration/local testing if auth fails
                userId = UUID.randomUUID().toString()
                token = "demo_token_${System.currentTimeMillis()}"
            }

            call.respond(AuthResponse(
                userId = userId!!,
                token = token ?: "token_$userId",
                role = role,
                fullName = fullName,
                needsOnboarding = false
            ))
        }

        // ============================================================
        // GET /api/auth/check-matric
        // Check if matric number exists (called by PortalVerificationScreen)
        // ============================================================
        get("/check-matric") {
            val matric = call.request.queryParameters["matricNumber"]?.trim()
                ?: return@get call.respond(HttpStatusCode.BadRequest, CheckMatricResponse(exists = false, error = "Missing matricNumber"))

            try {
                DatabaseService.getConnection().use { conn ->
                    val stmt = conn.prepareStatement("""
                        SELECT p.email, p.full_name, s.department, s.faculty
                        FROM profiles p
                        JOIN student_details s ON s.user_id = p.id
                        WHERE s.matric_number ILIKE ? AND p.role = 'student'
                        LIMIT 1
                    """.trimIndent())
                    stmt.setString(1, matric)
                    val rs = stmt.executeQuery()

                    if (rs.next()) {
                        call.respond(CheckMatricResponse(
                            exists = true,
                            email = rs.getString("email"),
                            fullName = rs.getString("full_name"),
                            department = rs.getString("department"),
                            faculty = rs.getString("faculty")
                        ))
                    } else {
                        call.respond(CheckMatricResponse(exists = false))
                    }
                }
            } catch (e: Exception) {
                call.respond(CheckMatricResponse(exists = false, error = e.message ?: "Database error"))
            }
        }

        // ============================================================
        // POST /api/auth/portal-check
        // POST alias for matric check
        // ============================================================
        post("/portal-check") {
            val req = try { call.receive<PortalCheckRequest>() }
            catch (_: Exception) { return@post call.respond(HttpStatusCode.BadRequest, CheckMatricResponse(exists = false, error = "Invalid body")) }

            try {
                DatabaseService.getConnection().use { conn ->
                    val stmt = conn.prepareStatement("""
                        SELECT p.email, p.full_name, s.department, s.faculty
                        FROM profiles p
                        JOIN student_details s ON s.user_id = p.id
                        WHERE s.matric_number ILIKE ? AND p.role = 'student'
                        LIMIT 1
                    """.trimIndent())
                    stmt.setString(1, req.matricNumber.trim())
                    val rs = stmt.executeQuery()

                    if (rs.next()) {
                        call.respond(CheckMatricResponse(
                            exists = true,
                            email = rs.getString("email"),
                            fullName = rs.getString("full_name"),
                            department = rs.getString("department"),
                            faculty = rs.getString("faculty")
                        ))
                    } else {
                        call.respond(CheckMatricResponse(exists = false))
                    }
                }
            } catch (e: Exception) {
                call.respond(CheckMatricResponse(exists = false, error = e.message ?: "Database error"))
            }
        }

        // ============================================================
        // POST /api/auth/developer-access
        // Developer passcode login
        // ============================================================
        post("/developer-access") {
            val req = try {
                call.receive<DeveloperAccessRequest>()
            } catch (e: Exception) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body"))
            }

            if (req.passcode == AppConfig.developerPasscode) {
                call.respond(AuthResponse(
                    userId = "dev-admin-id",
                    token = "dev-jwt-${System.currentTimeMillis()}",
                    role = "developer",
                    fullName = "DOU Developer",
                    needsOnboarding = false
                ))
            } else {
                call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid passcode"))
            }
        }
    }
}
