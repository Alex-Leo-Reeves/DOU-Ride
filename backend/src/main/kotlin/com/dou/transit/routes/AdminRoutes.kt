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
        // POST /api/admin/suspend-driver
        // Instant block: suspends driver profile, gate will reject them
        // ============================================================
        post("/suspend-driver") {
            val req = try { call.receive<SuspendDriverRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val profileStmt = conn.prepareStatement("""
                    UPDATE profiles SET is_suspended = true, suspension_reason = ?, updated_at = now()
                    WHERE id = ?::uuid AND role = 'driver'
                """.trimIndent())
                profileStmt.setString(1, req.reason)
                profileStmt.setString(2, req.driverId)
                val updated = profileStmt.executeUpdate()

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Driver not found"))
                }

                conn.prepareStatement("""
                    UPDATE driver_details SET driver_status = 'offline'
                    WHERE user_id = ?::uuid
                """.trimIndent()).apply { setString(1, req.driverId) }.executeUpdate()

                conn.prepareStatement("""
                    UPDATE trips SET status = 'cancelled', updated_at = now()
                    WHERE driver_id = ?::uuid AND status IN ('requested','accepted','boarding','in_progress')
                """.trimIndent()).apply { setString(1, req.driverId) }.executeUpdate()

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, req.driverId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "🚫 Account Suspended",
                        body = "Your driver account has been suspended: ${req.reason}",
                        platform = tokenRs.getString("platform")
                    )
                }

                println("[ADMIN] Driver ${req.driverId} suspended: ${req.reason}")
                call.respond(SuccessResponse("Driver suspended: ${req.reason}"))
            } catch (e: Exception) {
                println("[ADMIN] Suspend driver error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to suspend driver"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/suspend-student
        // Wallet freeze: prevents any withdrawals/transfers
        // ============================================================
        post("/suspend-student") {
            val req = try { call.receive<SuspendStudentRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val profileStmt = conn.prepareStatement("""
                    UPDATE profiles SET is_suspended = true, suspension_reason = ?, updated_at = now()
                    WHERE id = ?::uuid AND role = 'student'
                """.trimIndent())
                profileStmt.setString(1, req.reason)
                profileStmt.setString(2, req.studentId)
                val updated = profileStmt.executeUpdate()

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Student not found"))
                }

                conn.prepareStatement("""
                    UPDATE virtual_queue SET status = 'cancelled'
                    WHERE student_id = ?::uuid AND status IN ('waiting', 'called')
                """.trimIndent()).apply { setString(1, req.studentId) }.executeUpdate()

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, req.studentId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "🚫 Account Suspended",
                        body = "Your student account has been suspended: ${req.reason}",
                        platform = tokenRs.getString("platform")
                    )
                }

                println("[ADMIN] Student suspended: ${req.studentId} — ${req.reason}")
                call.respond(SuccessResponse("Student suspended: ${req.reason}"))
            } catch (e: Exception) {
                println("[ADMIN] Suspend student error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to suspend student"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/approve-bank-change
        // Approve a driver's pending bank change request
        // ============================================================
        post("/approve-bank-change") {
            val req = try { call.receive<ApproveBankChangeRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val metaStmt = conn.prepareStatement("""
                    SELECT metadata FROM wallet_transactions
                    WHERE user_id = ?::uuid AND type = 'withdrawal' AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                metaStmt.setString(1, req.driverId)
                val metaRs = metaStmt.executeQuery()

                if (metaRs.next()) {
                    conn.prepareStatement("""
                        UPDATE wallet_transactions SET status = 'completed', updated_at = now()
                        WHERE user_id = ?::uuid AND type = 'withdrawal' AND status = 'pending'
                    """.trimIndent()).apply { setString(1, req.driverId) }.executeUpdate()

                    println("[ADMIN] Bank change approved for driver ${req.driverId}")
                }

                call.respond(SuccessResponse("Bank change approved for driver"))
            } catch (e: Exception) {
                println("[ADMIN] Approve bank change error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to approve bank change"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/credit-wallet
        // Admin credit/debit wallet with audit trail
        // ============================================================
        post("/credit-wallet") {
            val req = try { call.receive<CreditWalletRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            if (req.amount == 0.0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Amount must be non-zero"))
            }

            val adminId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
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

                if (newBalance < 0) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance for debit"))
                }

                val reference = "ADM-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                val txType = if (req.amount > 0) "deposit" else "withdrawal"

                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                    VALUES (?::uuid, ?, ?, 0.00, ?, ?, 'completed', ?, ?, ?::jsonb)
                """.trimIndent()).apply {
                    setString(1, req.userId)
                    setString(2, txType)
                    setDouble(3, req.amount)
                    setDouble(4, currentBalance)
                    setDouble(5, newBalance)
                    setString(6, reference)
                    setString(7, "Admin adjustment: ${req.reason}")
                    setString(8, """{"adjusted_by":"$adminId","reason":"${req.reason}"}""")
                    executeUpdate()
                }

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, req.userId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    val direction = if (req.amount > 0) "credited" else "debited"
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "💰 Wallet $direction by Admin",
                        body = if (req.amount > 0) "₦${req.amount.toInt()} credited. Reason: ${req.reason}"
                               else "₦${(-req.amount).toInt()} debited. Reason: ${req.reason}",
                        platform = tokenRs.getString("platform")
                    )
                }

                println("[ADMIN] Wallet adjusted: ${req.userId} — ₦${req.amount.toInt()} — ${req.reason}")
                call.respond(SuccessResponse("Wallet adjusted: ₦${req.amount.toInt()}"))
            } catch (e: Exception) {
                println("[ADMIN] Credit wallet error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to adjust wallet"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/analytics
        // Dashboard analytics: active kekes, trips today, pending approvals, revenue
        // ============================================================
        get("/analytics") {
            val conn = DatabaseService.getConnection()
            try {
                val activeKekeStmt = conn.createStatement().executeQuery(
                    "SELECT COUNT(*) AS count FROM driver_details WHERE driver_status = 'idle' OR driver_status = 'en_route'"
                )
                val activeKekes = if (activeKekeStmt.next()) activeKekeStmt.getInt("count") else 0

                val tripsTodayStmt = conn.createStatement().executeQuery("""
                    SELECT COUNT(*) AS count FROM trips WHERE created_at >= CURRENT_DATE
                """.trimIndent())
                val tripsToday = if (tripsTodayStmt.next()) tripsTodayStmt.getInt("count") else 0

                val pendingBankStmt = conn.createStatement().executeQuery("""
                    SELECT COUNT(*) AS count FROM wallet_transactions
                    WHERE type = 'withdrawal' AND status = 'pending'
                """.trimIndent())
                val pendingBankApprovals = if (pendingBankStmt.next()) pendingBankStmt.getInt("count") else 0

                val revenueStmt = conn.createStatement().executeQuery("""
                    SELECT COALESCE(SUM(-amount), 0.00) AS revenue FROM wallet_transactions
                    WHERE type = 'platform_fee' AND status = 'completed' AND created_at >= CURRENT_DATE
                """.trimIndent())
                val platformRevenue = if (revenueStmt.next()) revenueStmt.getDouble("revenue") else 0.0

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
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch analytics"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/reports
        // All incident reports ordered by date DESC
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

                val reports = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = stmt.getString("id")
                    m["reporterName"] = stmt.getString("reporter_name")
                    m["reporterRole"] = stmt.getString("reporter_role")
                    m["targetName"] = stmt.getString("target_name") ?: "N/A"
                    m["targetRole"] = stmt.getString("target_role") ?: "N/A"
                    m["incidentType"] = stmt.getString("incident_type")
                    m["description"] = stmt.getString("description") ?: ""
                    m["status"] = stmt.getString("status")
                    m["createdAt"] = stmt.getTimestamp("created_at").toInstant().toString()
                    reports.add(m)
                }

                call.respond(reports)
            } catch (e: Exception) {
                println("[ADMIN] Reports list error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch reports"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/lost-items
        // All lost & found items ordered by date DESC
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

                val items = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = stmt.getString("id")
                    m["studentName"] = stmt.getString("student_name")
                    m["driverName"] = stmt.getString("driver_name") ?: "N/A"
                    m["fleetNumber"] = stmt.getInt("fleet_number")
                    m["itemDescription"] = stmt.getString("description")
                    m["category"] = stmt.getString("category") ?: "Other"
                    m["status"] = stmt.getString("status")
                    m["createdAt"] = stmt.getTimestamp("created_at").toInstant().toString()
                    items.add(m)
                }

                call.respond(items)
            } catch (e: Exception) {
                println("[ADMIN] Lost items list error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch lost items"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/emergencies
        // Emergency incidents sorted by date DESC
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

                val incidents = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["incidentId"] = stmt.getString("id")
                    m["status"] = stmt.getString("status")
                    m["studentName"] = stmt.getString("student_name")
                    m["studentPhone"] = stmt.getString("student_phone")
                    m["driverName"] = stmt.getString("driver_name") ?: "N/A"
                    m["driverFleetNumber"] = stmt.getInt("fleet_number")
                    m["driverLat"] = stmt.getDouble("driver_lat").takeIf { !stmt.wasNull() }
                    m["driverLng"] = stmt.getDouble("driver_lng").takeIf { !stmt.wasNull() }
                    m["studentLat"] = stmt.getDouble("student_lat")
                    m["studentLng"] = stmt.getDouble("student_lng")
                    m["createdAt"] = stmt.getTimestamp("created_at").toInstant().toString()
                    incidents.add(m)
                }

                call.respond(incidents)
            } catch (e: Exception) {
                println("[ADMIN] Emergencies list error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch emergencies"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/drivers
        // Full list of driver profiles
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

                val drivers = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = stmt.getString("id")
                    m["fullName"] = stmt.getString("full_name")
                    m["phone"] = stmt.getString("phone") ?: ""
                    m["email"] = stmt.getString("email") ?: ""
                    m["isSuspended"] = stmt.getBoolean("is_suspended")
                    m["suspensionReason"] = stmt.getString("suspension_reason") ?: ""
                    m["fleetNumber"] = stmt.getInt("fleet_number")
                    m["kekeRegistration"] = stmt.getString("keke_registration") ?: ""
                    m["maxSeats"] = stmt.getInt("max_seats")
                    m["currentSeats"] = stmt.getInt("current_seats")
                    m["driverStatus"] = stmt.getString("driver_status")
                    m["verificationQrCode"] = stmt.getString("verification_qr_code") ?: ""
                    drivers.add(m)
                }

                call.respond(drivers)
            } catch (e: Exception) {
                println("[ADMIN] Drivers list error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch drivers"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/admin/students
        // Full list of student profiles
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

                val students = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    val m = mutableMapOf<String, Any?>()
                    m["id"] = stmt.getString("id")
                    m["fullName"] = stmt.getString("full_name")
                    m["phone"] = stmt.getString("phone") ?: ""
                    m["email"] = stmt.getString("email") ?: ""
                    m["isSuspended"] = stmt.getBoolean("is_suspended")
                    m["suspensionReason"] = stmt.getString("suspension_reason") ?: ""
                    m["matricNumber"] = stmt.getString("matric_number")
                    m["department"] = stmt.getString("department") ?: ""
                    m["faculty"] = stmt.getString("faculty") ?: ""
                    m["level"] = stmt.getString("level") ?: ""
                    m["walletBalance"] = stmt.getDouble("wallet_balance")
                    students.add(m)
                }

                call.respond(students)
            } catch (e: Exception) {
                println("[ADMIN] Students list error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch students"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/resolve-report/{reportId}
        // Mark a report as resolved
        // ============================================================
        post("/resolve-report/{reportId}") {
            val reportId = call.parameters["reportId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing reportId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE reports SET status = 'resolved', updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, reportId) }.executeUpdate()

                call.respond(SuccessResponse("Report resolved"))
            } catch (e: Exception) {
                println("[ADMIN] Resolve report error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to resolve report"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/lost-item/close/{itemId}
        // Mark a lost item claim as closed (collected by student)
        // ============================================================
        post("/lost-item/close/{itemId}") {
            val itemId = call.parameters["itemId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing itemId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE lost_items SET status = 'collected', updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, itemId) }.executeUpdate()

                call.respond(SuccessResponse("Lost item claim closed"))
            } catch (e: Exception) {
                println("[ADMIN] Lost item close error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to close item"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/admin/unsuspend/{userId}
        // Unsuspend a user account
        // ============================================================
        post("/unsuspend/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE profiles SET is_suspended = false, suspension_reason = NULL, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, userId) }.executeUpdate()

                conn.prepareStatement("""
                    UPDATE driver_details SET driver_status = 'idle'
                    WHERE user_id = ?::uuid AND driver_status = 'offline'
                """.trimIndent()).apply { setString(1, userId) }.executeUpdate()

                call.respond(SuccessResponse("User unsuspended"))
            } catch (e: Exception) {
                println("[ADMIN] Unsuspend error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to unsuspend"))
            } finally {
                conn.close()
            }
        }
    }
}
