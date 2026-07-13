package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.config.AppConfig
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.SupabaseAuthService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
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
            val req = call.receive<RegisterStudentRequest>()

            // 1. Create auth user in Supabase
            val authResult = SupabaseAuthService.signUp(
                email = req.email,
                password = req.password,
                metadata = mapOf(
                    "matricNumber" to req.matricNumber,
                    "role" to "student",
                    "fullName" to req.fullName
                )
            )

            if (authResult.userId == null) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse(
                    error = authResult.error ?: "Registration failed"
                ))
                return@post
            }

            val userId = authResult.userId
            val now = Timestamp.from(Instant.now())

            // 2. Insert into profiles table
            try {
                DatabaseService.getConnection().use { conn ->
                    conn.prepareStatement("""
                        INSERT INTO profiles (id, role, full_name, phone, email, created_at, updated_at)
                        VALUES (?, 'student', ?, ?, ?, ?, ?)
                    """).apply {
                        setObject(1, UUID.fromString(userId))
                        setString(2, req.fullName)
                        setString(3, req.phone)
                        setString(4, req.email)
                        setTimestamp(5, now)
                        setTimestamp(6, now)
                        executeUpdate()
                    }

                    // 3. Insert into student_details table
                    conn.prepareStatement("""
                        INSERT INTO student_details (id, user_id, matric_number, department, faculty)
                        VALUES (?, ?, ?, ?, ?)
                    """).apply {
                        setObject(1, UUID.randomUUID())
                        setObject(2, UUID.fromString(userId))
                        setString(3, req.matricNumber)
                        setString(4, req.department)
                        setString(5, req.faculty)
                        executeUpdate()
                    }

                    // 4. Create wallet with zero balance
                    conn.prepareStatement("""
                        INSERT INTO wallets (id, user_id, balance)
                        VALUES (?, ?, 0.0)
                    """).apply {
                        setObject(1, UUID.randomUUID())
                        setObject(2, UUID.fromString(userId))
                        executeUpdate()
                    }
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(
                    error = "Database error during registration",
                    details = e.message
                ))
                return@post
            }

            call.respond(HttpStatusCode.Created, AuthResponse(
                userId = userId,
                token = authResult.token ?: "",
                role = "student",
                fullName = req.fullName,
                needsOnboarding = true
            ))
        }

        // ============================================================
        // POST /api/auth/register/driver
        // Register a keke driver with face photo and fleet number
        // ============================================================
        post("/register/driver") {
            val req = call.receive<RegisterDriverRequest>()

            // Use phone as email for Supabase auth (drivers may not have email)
            val driverEmail = "${req.phone.replace(Regex("[^0-9]"), "")}@driver.dou.transit"

            // 1. Create auth user
            val authResult = SupabaseAuthService.signUp(
                email = driverEmail,
                password = req.password,
                metadata = mapOf(
                    "role" to "driver",
                    "fullName" to req.fullName
                )
            )

            if (authResult.userId == null) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse(
                    error = authResult.error ?: "Driver registration failed"
                ))
                return@post
            }

            val userId = authResult.userId
            val now = Timestamp.from(Instant.now())

            // 2. Generate fleet number
            val fleetNumber = try {
                DatabaseService.getConnection().use { conn ->
                    val rs = conn.prepareStatement(
                        "SELECT COALESCE(MAX(fleet_number), 0) + 1 FROM driver_details"
                    ).executeQuery()
                    rs.next()
                    rs.getInt(1)
                }
            } catch (_: Exception) {
                Random().nextInt(900) + 100
            }

            // 3. Generate verification QR code data
            val qrCodeUuid = UUID.randomUUID().toString()
            val qrCodeData = """{"driver_id":"$userId","fleet_number":$fleetNumber}"""

            // 4. Insert into profiles and driver_details tables
            try {
                DatabaseService.getConnection().use { conn ->
                    // Insert profile
                    conn.prepareStatement("""
                        INSERT INTO profiles (id, role, full_name, phone, email, created_at, updated_at)
                        VALUES (?, 'driver', ?, ?, ?, ?, ?)
                    """).apply {
                        setObject(1, UUID.fromString(userId))
                        setString(2, req.fullName)
                        setString(3, req.phone)
                        setString(4, driverEmail)
                        setTimestamp(5, now)
                        setTimestamp(6, now)
                        executeUpdate()
                    }

                    // Insert driver_details
                    conn.prepareStatement("""
                        INSERT INTO driver_details (id, user_id, keke_registration, fleet_number, max_seats, face_photo_url, verification_qr_code, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'idle')
                    """).apply {
                        setObject(1, UUID.randomUUID())
                        setObject(2, UUID.fromString(userId))
                        setString(3, req.kekeRegistration)
                        setInt(4, fleetNumber)
                        setInt(5, req.maxSeats)
                        setString(6, "face_photos/$userId.jpg")
                        setString(7, qrCodeData)
                        executeUpdate()
                    }

                    // Create wallet
                    conn.prepareStatement("""
                        INSERT INTO wallets (id, user_id, balance)
                        VALUES (?, ?, 0.0)
                    """).apply {
                        setObject(1, UUID.randomUUID())
                        setObject(2, UUID.fromString(userId))
                        executeUpdate()
                    }
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(
                    error = "Database error during driver registration",
                    details = e.message
                ))
                return@post
            }

            call.respond(HttpStatusCode.Created, AuthResponse(
                userId = userId,
                token = authResult.token ?: "",
                role = "driver",
                fullName = req.fullName,
                needsOnboarding = true
            ))
        }

        // ============================================================
        // POST /api/auth/login
        // Authenticate user via Supabase Auth
        // ============================================================
        post("/login") {
            val req = call.receive<LoginRequest>()

            // Try email first, phone as fallback
            val email = if (req.emailOrPhone.contains("@")) {
                req.emailOrPhone
            } else {
                // Drivers use phone-based email
                "${req.emailOrPhone.replace(Regex("[^0-9]"), "")}@driver.dou.transit"
            }

            // Try student email format too
            val loginEmail = if (email == req.emailOrPhone) email else null

            val authResult = if (loginEmail != null) {
                SupabaseAuthService.signIn(loginEmail, req.password)
            } else {
                // Try driver email format
                val driverResult = SupabaseAuthService.signIn(
                    "${req.emailOrPhone.replace(Regex("[^0-9]"), "")}@driver.dou.transit",
                    req.password
                )
                if (driverResult.userId == null) {
                    // Fallback: try as student email directly
                    SupabaseAuthService.signIn(req.emailOrPhone, req.password)
                } else {
                    driverResult
                }
            }

            if (authResult.userId == null || authResult.token == null) {
                call.respond(HttpStatusCode.Unauthorized, ErrorResponse(
                    error = "Invalid credentials"
                ))
                return@post
            }

            // Fetch profile info from database
            var fullName = "User"
            var role = "student"
            var needsOnboarding = false
            var isSuspended = false

            try {
                DatabaseService.getConnection().use { conn ->
                    val rs = conn.prepareStatement(
                        "SELECT role, full_name, is_suspended FROM profiles WHERE id = ?::uuid"
                    ).apply {
                        setString(1, authResult.userId)
                    }.executeQuery()

                    if (rs.next()) {
                        role = rs.getString("role") ?: "student"
                        fullName = rs.getString("full_name") ?: "User"
                        isSuspended = rs.getBoolean("is_suspended")

                        if (role == "student") {
                            val srs = conn.prepareStatement(
                                "SELECT 1 FROM student_details WHERE user_id = ?::uuid"
                            ).apply { setString(1, authResult.userId) }.executeQuery()
                            needsOnboarding = !srs.next()
                        } else if (role == "driver") {
                            val drs = conn.prepareStatement(
                                "SELECT 1 FROM driver_details WHERE user_id = ?::uuid"
                            ).apply { setString(1, authResult.userId) }.executeQuery()
                            needsOnboarding = !drs.next()
                        }
                    }
                }
            } catch (_: Exception) {
                // Use defaults on DB error
            }

            if (isSuspended) {
                call.respond(HttpStatusCode.Forbidden, ErrorResponse(
                    error = "Account suspended. Contact student affairs."
                ))
                return@post
            }

            call.respond(AuthResponse(
                userId = authResult.userId!!,
                token = authResult.token!!,
                role = role,
                fullName = fullName,
                needsOnboarding = needsOnboarding
            ))
        }

        // ============================================================
        // POST /api/auth/developer-access
        // Hidden developer access via passcode (admin-created accounts)
        // ============================================================
        post("/developer-access") {
            val req = call.receive<DeveloperAccessRequest>()

            if (req.passcode == AppConfig.developerPasscode) {
                call.respond(AuthResponse(
                    userId = "dev-admin",
                    token = "dev-jwt-${System.currentTimeMillis()}",
                    role = "developer",
                    fullName = "Developer"
                ))
            } else {
                call.respond(HttpStatusCode.Unauthorized, ErrorResponse(
                    error = "Invalid passcode"
                ))
            }
        }
    }
}
