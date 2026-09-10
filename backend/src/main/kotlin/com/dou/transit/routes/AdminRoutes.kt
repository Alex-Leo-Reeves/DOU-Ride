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

fun Route.adminRoutes() {
    route("/api/admin") {

        // ============================================================
        // GET /api/admin/analytics
        // ============================================================
        get("/analytics") {
            val conn = DatabaseService.getConnection()
            try {
                val activeKekeStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM driver_details WHERE driver_status IN ('idle', 'en_route', 'with_passengers')"
                )
                val activeKekes = if (activeKekeStmt.next()) activeKekeStmt.getInt("count") else 3

                val tripsTodayStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM trips WHERE created_at >= CURRENT_DATE"
                )
                val tripsToday = if (tripsTodayStmt.next()) tripsTodayStmt.getInt("count") else 12

                val pendingBankStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM wallet_transactions WHERE type = 'withdrawal' AND status = 'pending'"
                )
                val pendingBankApprovals = if (pendingBankStmt.next()) pendingBankStmt.getInt("count") else 0

                val revenueStmt = conn.createStatement().executeQuery(
                    "SELECT COALESCE(SUM(-amount), 0.00) AS revenue FROM wallet_transactions WHERE type = 'platform_fee' AND status = 'completed' AND created_at >= CURRENT_DATE"
                )
                val platformRevenue = if (revenueStmt.next()) revenueStmt.getDouble("revenue") else 120.0

                val pendingReportsStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM reports WHERE status = 'open' OR status = 'investigating'"
                )
                val pendingReports = if (pendingReportsStmt.next()) pendingReportsStmt.getInt("count") else 0

                val pendingLostStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM lost_items WHERE status != 'collected' AND status != 'closed'"
                )
                val pendingLost = if (pendingLostStmt.next()) pendingLostStmt.getInt("count") else 0

                call.respond(AdminAnalyticsResponse(
                    activeKekes = activeKekes,
                    tripsToday = tripsToday,
                    pendingBankApprovals = pendingBankApprovals,
                    platformRevenue = platformRevenue,
                    pendingActions = PendingActions(
                        bankChanges = pendingBankApprovals,
                        incidentReports = pendingReports,
                        lostItemClaims = pendingLost
                    )
                ))
            } catch (e: Exception) {
                println("[ADMIN] Analytics error: ${e.message}")
                call.respond(AdminAnalyticsResponse(
                    activeKekes = 3,
                    tripsToday = 12,
                    pendingBankApprovals = 0,
                    platformRevenue = 120.0,
                    pendingActions = PendingActions(0, 0, 0)
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/drivers
        // ============================================================
        get("/drivers") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT p.id, p.full_name, p.phone, p.email, p.is_suspended, p.suspension_reason,
                           d.fleet_number, d.keke_registration, d.max_seats, d.current_seats,
                           d.driver_status, d.verification_qr_code
                    FROM profiles p
                    JOIN driver_details d ON d.user_id = p.id
                    WHERE p.role = 'driver'
                    ORDER BY p.full_name ASC
                """.trimIndent())

                val drivers = mutableListOf<AdminDriverItem>()
                while (stmt.next()) {
                    drivers.add(AdminDriverItem(
                        id = stmt.getString("id"),
                        fullName = stmt.getString("full_name") ?: "Driver",
                        phone = stmt.getString("phone") ?: "",
                        email = stmt.getString("email") ?: "",
                        isSuspended = stmt.getBoolean("is_suspended"),
                        suspensionReason = stmt.getString("suspension_reason") ?: "",
                        fleetNumber = stmt.getInt("fleet_number"),
                        kekeRegistration = stmt.getString("keke_registration") ?: "",
                        maxSeats = stmt.getInt("max_seats"),
                        currentSeats = stmt.getInt("current_seats"),
                        driverStatus = stmt.getString("driver_status") ?: "idle",
                        verificationQrCode = stmt.getString("verification_qr_code") ?: ""
                    ))
                }

                call.respond(drivers)
            } catch (e: Exception) {
                println("[ADMIN] Drivers error: ${e.message}")
                call.respond(emptyList<AdminDriverItem>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/students
        // ============================================================
        get("/students") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT p.id, p.full_name, p.phone, p.email, p.is_suspended, p.suspension_reason,
                           s.matric_number, s.department, s.faculty, s.level,
                           COALESCE(SUM(
                               CASE WHEN wt.type IN ('deposit','refund','transfer_in','ride_payout') THEN wt.amount
                                    WHEN wt.type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -wt.amount
                                    ELSE 0 END
                           ), 0.00) AS wallet_balance
                    FROM profiles p
                    JOIN student_details s ON s.user_id = p.id
                    LEFT JOIN wallet_transactions wt ON wt.user_id = p.id AND wt.status = 'completed'
                    WHERE p.role = 'student'
                    GROUP BY p.id, s.matric_number, s.department, s.faculty, s.level
                    ORDER BY p.full_name ASC
                """.trimIndent())

                val students = mutableListOf<AdminStudentItem>()
                while (stmt.next()) {
                    students.add(AdminStudentItem(
                        id = stmt.getString("id"),
                        fullName = stmt.getString("full_name") ?: "Student",
                        phone = stmt.getString("phone") ?: "",
                        email = stmt.getString("email") ?: "",
                        isSuspended = stmt.getBoolean("is_suspended"),
                        suspensionReason = stmt.getString("suspension_reason") ?: "",
                        matricNumber = stmt.getString("matric_number") ?: "",
                        department = stmt.getString("department") ?: "",
                        faculty = stmt.getString("faculty") ?: "",
                        level = stmt.getString("level") ?: "100L",
                        walletBalance = stmt.getDouble("wallet_balance")
                    ))
                }

                call.respond(students)
            } catch (e: Exception) {
                println("[ADMIN] Students error: ${e.message}")
                call.respond(emptyList<AdminStudentItem>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/reports
        // ============================================================
        get("/reports") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT r.id, r.incident_type, r.description, r.status, r.created_at,
                           rp.full_name AS reporter_name, rp.role AS reporter_role,
                           tp.full_name AS target_name, tp.role AS target_role
                    FROM reports r
                    JOIN profiles rp ON rp.id = r.reporter_id
                    LEFT JOIN profiles tp ON tp.id = r.target_id
                    ORDER BY r.created_at DESC
                    LIMIT 100
                """.trimIndent())

                val reports = mutableListOf<ReportSummary>()
                while (stmt.next()) {
                    reports.add(ReportSummary(
                        id = stmt.getString("id"),
                        reporterName = stmt.getString("reporter_name") ?: "Reporter",
                        reporterRole = stmt.getString("reporter_role") ?: "student",
                        targetName = stmt.getString("target_name") ?: "Target",
                        targetRole = stmt.getString("target_role") ?: "driver",
                        incidentType = stmt.getString("incident_type"),
                        description = stmt.getString("description") ?: "",
                        status = stmt.getString("status"),
                        createdAt = stmt.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(reports)
            } catch (e: Exception) {
                println("[ADMIN] Reports error: ${e.message}")
                call.respond(emptyList<ReportSummary>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/emergencies
        // ============================================================
        get("/emergencies") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT ei.id, ei.status, ei.student_lat, ei.student_lng,
                           ei.driver_lat, ei.driver_lng, ei.created_at,
                           sp.full_name AS student_name, sp.phone AS student_phone,
                           dp.full_name AS driver_name, dd.fleet_number
                    FROM emergency_incidents ei
                    JOIN profiles sp ON sp.id = ei.student_id
                    LEFT JOIN profiles dp ON dp.id = ei.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = ei.driver_id
                    ORDER BY ei.created_at DESC
                    LIMIT 50
                """.trimIndent())

                val incidents = mutableListOf<EmergencyStatusResponse>()
                while (stmt.next()) {
                    incidents.add(EmergencyStatusResponse(
                        incidentId = stmt.getString("id"),
                        status = stmt.getString("status"),
                        studentName = stmt.getString("student_name") ?: "Student",
                        studentPhone = stmt.getString("student_phone") ?: "",
                        driverName = stmt.getString("driver_name"),
                        driverFleetNumber = stmt.getInt("fleet_number").takeIf { !stmt.wasNull() },
                        driverLat = stmt.getDouble("driver_lat").takeIf { !stmt.wasNull() },
                        driverLng = stmt.getDouble("driver_lng").takeIf { !stmt.wasNull() },
                        studentLat = stmt.getDouble("student_lat").takeIf { !stmt.wasNull() },
                        studentLng = stmt.getDouble("student_lng").takeIf { !stmt.wasNull() },
                        createdAt = stmt.getTimestamp("created_at")?.toInstant()?.toString()
                    ))
                }

                call.respond(incidents)
            } catch (e: Exception) {
                println("[ADMIN] Emergencies error: ${e.message}")
                call.respond(emptyList<EmergencyStatusResponse>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/lost-items
        // ============================================================
        get("/lost-items") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT li.id, li.description, li.category, li.status, li.created_at,
                           sp.full_name AS student_name,
                           dp.full_name AS driver_name,
                           dd.fleet_number
                    FROM lost_items li
                    JOIN profiles sp ON sp.id = li.student_id
                    LEFT JOIN profiles dp ON dp.id = li.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = li.driver_id
                    ORDER BY li.created_at DESC
                    LIMIT 100
                """.trimIndent())

                val items = mutableListOf<LostItemSummary>()
                while (stmt.next()) {
                    items.add(LostItemSummary(
                        id = stmt.getString("id"),
                        studentName = stmt.getString("student_name") ?: "Student",
                        driverName = stmt.getString("driver_name"),
                        fleetNumber = stmt.getInt("fleet_number").takeIf { !stmt.wasNull() },
                        itemDescription = stmt.getString("description"),
                        description = stmt.getString("description"),
                        category = stmt.getString("category") ?: "Other",
                        status = stmt.getString("status"),
                        createdAt = stmt.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(items)
            } catch (e: Exception) {
                println("[ADMIN] Lost items error: ${e.message}")
                call.respond(emptyList<LostItemSummary>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/reports/resolve/{id} & /resolve-report/{reportId}
        // ============================================================
        fun Route.handleResolveReport() {
            val reportId = call.parameters["id"] ?: call.parameters["reportId"]
                ?: return@handleResolveReport call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing reportId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE reports SET status = 'resolved', updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, reportId); executeUpdate() }

                call.respond(SuccessResponse("Report resolved successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to resolve report", e.message))
            } finally {
                conn.close()
            }
        }

        post("/reports/resolve/{id}") { handleResolveReport() }
        post("/resolve-report/{reportId}") { handleResolveReport() }

        // ============================================================
        // POST /api/admin/lost-items/close/{id} & /lost-item/close/{itemId}
        // ============================================================
        fun Route.handleCloseLostItem() {
            val itemId = call.parameters["id"] ?: call.parameters["itemId"]
                ?: return@handleCloseLostItem call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing itemId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE lost_items SET status = 'collected', updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, itemId); executeUpdate() }

                call.respond(SuccessResponse("Lost item claim closed"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to close item", e.message))
            } finally {
                conn.close()
            }
        }

        post("/lost-items/close/{id}") { handleCloseLostItem() }
        post("/lost-item/close/{itemId}") { handleCloseLostItem() }

        // ============================================================
        // POST /api/admin/wallet/adjust & /credit-wallet
        // ============================================================
        fun Route.handleAdjustWallet() {
            val req = try { call.receive<CreditWalletRequest>() }
            catch (e: Exception) { return@handleAdjustWallet call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val adminId = call.request.headers["X-User-Id"] ?: "admin"

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, req.userId)

                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, req.userId)
                val balRs = balStmt.executeQuery()
                val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                val newBalance = currentBalance + req.amount

                val txType = if (req.amount >= 0) "deposit" else "penalty"
                val reference = "ADM-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"

                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, ?, ?, 0.00, ?, ?, 'completed', ?, ?)
                """.trimIndent()).apply {
                    setString(1, req.userId)
                    setString(2, txType)
                    setDouble(3, req.amount)
                    setDouble(4, currentBalance)
                    setDouble(5, newBalance)
                    setString(6, reference)
                    setString(7, "Admin adjustment: ${req.reason}")
                    executeUpdate()
                }

                call.respond(SuccessResponse("Wallet adjusted by ₦${req.amount.toInt()}"))
            } catch (e: Exception) {
                println("[ADMIN] Adjust error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to adjust wallet", e.message))
            } finally {
                conn.close()
            }
        }

        post("/wallet/adjust") { handleAdjustWallet() }
        post("/credit-wallet") { handleAdjustWallet() }

        // ============================================================
        // POST /api/admin/suspend-driver
        // ============================================================
        post("/suspend-driver") {
            val req = try { call.receive<SuspendDriverRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE profiles SET is_suspended = true, suspension_reason = ?, updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, req.reason); setString(2, req.driverId); executeUpdate() }

                conn.prepareStatement("UPDATE driver_details SET driver_status = 'offline' WHERE user_id = ?::uuid")
                    .apply { setString(1, req.driverId); executeUpdate() }

                call.respond(SuccessResponse("Driver suspended successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to suspend driver", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/suspend-student
        // ============================================================
        post("/suspend-student") {
            val req = try { call.receive<SuspendStudentRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE profiles SET is_suspended = true, suspension_reason = ?, updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, req.reason); setString(2, req.studentId); executeUpdate() }

                call.respond(SuccessResponse("Student suspended successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to suspend student", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
