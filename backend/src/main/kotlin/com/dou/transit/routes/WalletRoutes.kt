package com.dou.transit.routes

import com.dou.transit.config.AppConfig
import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.*
import java.util.UUID

fun Route.walletRoutes() {
    val json = Json { prettyPrint = true; ignoreUnknownKeys = true }

    val httpClient = HttpClient(CIO) {
        engine {
            requestTimeout = 15_000
        }
    }

    route("/api/wallet") {

        // ============================================================
        // GET /api/wallet/balance/{userId}
        // Returns current balance and recent transactions
        // ============================================================
        get("/balance/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
                // Ensure profile exists in DB
                DatabaseService.ensureProfileExists(conn, userId)

                val balanceStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balanceStmt.setString(1, userId)
                val balanceRs = balanceStmt.executeQuery()
                val balance = if (balanceRs.next()) balanceRs.getDouble("balance") else 0.0

                val pendingStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(amount), 0.00) AS pending
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND type = 'deposit' AND status = 'pending'
                """.trimIndent())
                pendingStmt.setString(1, userId)
                val pendingRs = pendingStmt.executeQuery()
                val pendingBalance = if (pendingRs.next()) pendingRs.getDouble("pending") else 0.0

                val txStmt = conn.prepareStatement("""
                    SELECT id, type, amount, fee, balance_before, balance_after,
                           status, reference, description, created_at
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid
                    ORDER BY created_at DESC
                    LIMIT 50
                """.trimIndent())
                txStmt.setString(1, userId)
                val txRs = txStmt.executeQuery()

                val transactions = mutableListOf<WalletTransactionItem>()
                while (txRs.next()) {
                    transactions.add(WalletTransactionItem(
                        id = txRs.getString("id"),
                        type = txRs.getString("type"),
                        amount = txRs.getDouble("amount"),
                        fee = txRs.getDouble("fee"),
                        balance_before = txRs.getDouble("balance_before"),
                        balance_after = txRs.getDouble("balance_after"),
                        status = txRs.getString("status"),
                        reference = txRs.getString("reference"),
                        description = txRs.getString("description"),
                        created_at = txRs.getTimestamp("created_at")?.toInstant()?.toString()
                    ))
                }

                call.respond(WalletBalanceResponse(
                    balance = balance,
                    pendingBalance = pendingBalance,
                    transactions = transactions
                ))
            } catch (e: Exception) {
                println("[WALLET] Error fetching balance: ${e.message}")
                call.respond(WalletBalanceResponse(
                    balance = 0.0,
                    pendingBalance = 0.0,
                    transactions = emptyList()
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/deposit
        // Creates pending deposit transaction and generates payment link
        // ============================================================
        post("/deposit") {
            val req = try { call.receive<DepositRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            if (req.amount < AppConfig.minDeposit) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Minimum deposit is ₦${AppConfig.minDeposit.toInt()}"))
            }

            val userId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val totalAmount = req.amount + AppConfig.platformFeeNaira
            val transactionRef = "DOU-DEP-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"

            val conn = DatabaseService.getConnection()
            try {
                // Ensure profile exists in profiles table
                DatabaseService.ensureProfileExists(conn, userId)

                var userEmail = "student@dou.edu.ng"
                var userName = "DOU Student"
                var userPhone = "08000000000"

                try {
                    val profileStmt = conn.prepareStatement("SELECT email, full_name, phone FROM profiles WHERE id = ?::uuid")
                    profileStmt.setString(1, userId)
                    val profileRs = profileStmt.executeQuery()
                    if (profileRs.next()) {
                        val em = profileRs.getString("email")
                        val nm = profileRs.getString("full_name")
                        val ph = profileRs.getString("phone")
                        if (!em.isNullOrBlank()) userEmail = em
                        if (!nm.isNullOrBlank()) userName = nm
                        if (!ph.isNullOrBlank()) userPhone = ph
                    }
                } catch (_: Exception) {}

                val txStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, status, reference, description)
                    VALUES (?::uuid, 'deposit', ?, ?, 'pending', ?, 'Wallet deposit via Flutterwave')
                """.trimIndent())
                txStmt.setString(1, userId)
                txStmt.setDouble(2, totalAmount)
                txStmt.setDouble(3, AppConfig.platformFeeNaira)
                txStmt.setString(4, transactionRef)
                txStmt.executeUpdate()

                // Request Flutterwave Hosted Checkout Link
                var checkoutLink = "https://checkout.flutterwave.com/v3/hosted/pay"
                try {
                    val flwPayload = buildJsonObject {
                        put("tx_ref", transactionRef)
                        put("amount", totalAmount.toString())
                        put("currency", "NGN")
                        put("redirect_url", "${AppConfig.baseUrl}/api/wallet/deposit/callback")
                        put("customer", buildJsonObject {
                            put("email", userEmail)
                            put("name", userName)
                            put("phonenumber", userPhone)
                        })
                        put("customizations", buildJsonObject {
                            put("title", "DOU Transit Wallet Credit")
                            put("description", "Dennis Osadebay University Transit Pass")
                            put("logo", "https://dou-transit-api.onrender.com/assets/logo.png")
                        })
                    }

                    val flwResp = httpClient.post("https://api.flutterwave.com/v3/payments") {
                        header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                        contentType(ContentType.Application.Json)
                        setBody(flwPayload.toString())
                    }

                    if (flwResp.status.isSuccess()) {
                        val bodyText = flwResp.bodyAsText()
                        val flwJson = json.parseToJsonElement(bodyText).jsonObject
                        val link = flwJson["data"]?.jsonObject?.get("link")?.jsonPrimitive?.contentOrNull
                        if (!link.isNullOrBlank()) {
                            checkoutLink = link
                        }
                    }
                } catch (flwEx: Exception) {
                    println("[WALLET] Outbound Flutterwave link error: ${flwEx.message}")
                }

                call.respond(DepositResponse(
                    paymentUrl = checkoutLink,
                    transactionRef = transactionRef
                ))
            } catch (e: Exception) {
                println("[WALLET] Deposit error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Deposit initiation failed", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/wallet/verify-deposit/{txRef}
        // Verifies Flutterwave payment and credits wallet
        // ============================================================
        get("/verify-deposit/{txRef}") {
            val txRef = call.parameters["txRef"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing txRef"))

            val conn = DatabaseService.getConnection()
            try {
                val txStmt = conn.prepareStatement("""
                    SELECT id, user_id, amount, fee, status FROM wallet_transactions
                    WHERE reference = ? LIMIT 1
                """.trimIndent())
                txStmt.setString(1, txRef)
                val txRs = txStmt.executeQuery()

                if (!txRs.next()) {
                    return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Transaction reference not found"))
                }

                val userId = txRs.getString("user_id")
                val totalAmount = txRs.getDouble("amount")
                val fee = txRs.getDouble("fee")
                val status = txRs.getString("status")
                val netAmount = totalAmount - fee

                if (status == "completed") {
                    return@get call.respond(VerifyDepositResponse(
                        verified = true,
                        status = "completed",
                        netAmount = netAmount,
                        message = "Deposit already credited"
                    ))
                }

                // Verify with Flutterwave API
                var isSuccessful = false
                try {
                    val verifyResp = httpClient.get("https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=$txRef") {
                        header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                    }
                    if (verifyResp.status.isSuccess()) {
                        val verifyJson = json.parseToJsonElement(verifyResp.bodyAsText()).jsonObject
                        val flwStatus = verifyJson["data"]?.jsonObject?.get("status")?.jsonPrimitive?.contentOrNull
                        if (flwStatus.equals("successful", ignoreCase = true)) {
                            isSuccessful = true
                        }
                    }
                } catch (flwEx: Exception) {
                    println("[WALLET] Flutterwave verify API check failed: ${flwEx.message}")
                }

                if (!isSuccessful) {
                    return@get call.respond(VerifyDepositResponse(
                        verified = false,
                        status = status,
                        message = "Payment has not yet settled with Flutterwave. Please check back shortly."
                    ))
                }

                // Compute current balance
                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, userId)
                val balRs = balStmt.executeQuery()
                val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                val newBalance = currentBalance + netAmount

                // Update transaction to completed
                val updateStmt = conn.prepareStatement("""
                    UPDATE wallet_transactions
                    SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now()
                    WHERE reference = ?
                """.trimIndent())
                updateStmt.setDouble(1, currentBalance)
                updateStmt.setDouble(2, newBalance)
                updateStmt.setString(3, txRef)
                updateStmt.executeUpdate()

                call.respond(VerifyDepositResponse(
                    verified = true,
                    status = "completed",
                    netAmount = netAmount,
                    newBalance = newBalance,
                    message = "Wallet credited successfully with ₦${netAmount.toInt()}"
                ))
            } catch (e: Exception) {
                println("[WALLET] Verify deposit error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to verify deposit", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/deposit/webhook
        // Flutterwave webhook for real-time payment notifications
        // ============================================================
        post("/deposit/webhook") {
            val webhookPayload = try { call.receive<FlutterwaveWebhookPayload>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid webhook payload", e.message)) }

            val txRef = webhookPayload.data.tx_ref
            val flwStatus = webhookPayload.data.status
            val event = webhookPayload.event

            println("[WALLET] Flutterwave webhook received: event=$event, tx_ref=$txRef, status=$flwStatus")

            val conn = DatabaseService.getConnection()
            try {
                val txStmt = conn.prepareStatement("""
                    SELECT id, user_id, amount, fee, status FROM wallet_transactions
                    WHERE reference = ? LIMIT 1
                """.trimIndent())
                txStmt.setString(1, txRef)
                val txRs = txStmt.executeQuery()

                if (!txRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Transaction reference not found"))
                }

                val userId = txRs.getString("user_id")
                val totalAmount = txRs.getDouble("amount")
                val fee = txRs.getDouble("fee")
                val currentStatus = txRs.getString("status")
                val netAmount = totalAmount - fee

                if (currentStatus == "completed") {
                    return@post call.respond(SuccessResponse("Transaction already processed"))
                }

                val newStatus = when {
                    event == "charge.completed" && flwStatus.equals("successful", ignoreCase = true) -> "completed"
                    flwStatus.equals("successful", ignoreCase = true) -> "completed"
                    flwStatus.equals("cancelled", ignoreCase = true) -> "failed"
                    flwStatus.equals("failed", ignoreCase = true) -> "failed"
                    else -> null
                }

                if (newStatus == null) {
                    return@post call.respond(SuccessResponse("Webhook acknowledged"))
                }

                if (newStatus == "completed") {
                    val balStmt = conn.prepareStatement("""
                        SELECT COALESCE(SUM(
                            CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                                 WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                                 ELSE 0 END
                        ), 0.00) AS balance
                        FROM wallet_transactions
                        WHERE user_id = ?::uuid AND status = 'completed'
                    """.trimIndent())
                    balStmt.setString(1, userId)
                    val balRs = balStmt.executeQuery()
                    val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                    val newBalance = currentBalance + netAmount

                    val updateStmt = conn.prepareStatement("""
                        UPDATE wallet_transactions
                        SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now()
                        WHERE reference = ?
                    """.trimIndent())
                    updateStmt.setDouble(1, currentBalance)
                    updateStmt.setDouble(2, newBalance)
                    updateStmt.setString(3, txRef)
                    updateStmt.executeUpdate()

                    println("[WALLET] Wallet credited via webhook: user=$userId, amount=$netAmount")
                } else {
                    val updateStmt = conn.prepareStatement("""
                        UPDATE wallet_transactions
                        SET status = 'failed', updated_at = now()
                        WHERE reference = ?
                    """.trimIndent())
                    updateStmt.setString(1, txRef)
                    updateStmt.executeUpdate()

                    println("[WALLET] Transaction marked as failed via webhook: tx_ref=$txRef, flw_status=$flwStatus")
                }

                call.respond(SuccessResponse("Webhook processed successfully"))
            } catch (e: Exception) {
                println("[WALLET] Webhook processing error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Webhook processing failed", e.message))
            } finally {
                conn.close()
            }
        }
        // ============================================================
        post("/withdraw") {
            val req = try { call.receive<WithdrawRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val userId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Withdrawal amount must be greater than zero"))
            }

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, userId)

                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, userId)
                val balRs = balStmt.executeQuery()
                val balance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                if (balance < req.amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient wallet balance for withdrawal"))
                }

                val reference = "DOU-WTH-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                val newBalance = balance - req.amount

                val txStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                    VALUES (?::uuid, 'withdrawal', ?, 0.00, ?, ?, 'pending', ?, ?, ?::jsonb)
                """.trimIndent())
                txStmt.setString(1, userId)
                txStmt.setDouble(2, req.amount)
                txStmt.setDouble(3, balance)
                txStmt.setDouble(4, newBalance)
                txStmt.setString(5, reference)
                txStmt.setString(6, "Withdrawal to ${req.bankName ?: "Bank"} (${req.accountNumber})")
                txStmt.setString(7, """{"accountNumber":"${req.accountNumber}","bankCode":"${req.bankCode}","bankName":"${req.bankName ?: ""}"}""")
                txStmt.executeUpdate()

                call.respond(SuccessResponse("Withdrawal request submitted successfully"))
            } catch (e: Exception) {
                println("[WALLET] Withdrawal error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Withdrawal request failed", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/transfer
        // P2P / Friend transfer
        // ============================================================
        post("/transfer") {
            val req = try { call.receive<TransferRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val senderId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Transfer amount must be positive"))
            }
            if (senderId == req.recipientId) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Cannot transfer to yourself"))
            }

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, senderId)

                // Check sender balance
                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, senderId)
                val balRs = balStmt.executeQuery()
                val senderBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                if (senderBalance < req.amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance for transfer"))
                }

                // Verify recipient exists
                var resolvedRecipientId = req.recipientId
                val recipStmt = conn.prepareStatement("""
                    SELECT p.id, p.full_name FROM profiles p
                    LEFT JOIN student_details s ON s.user_id = p.id
                    WHERE p.id = ?::uuid OR s.matric_number ILIKE ? OR p.phone = ?
                    LIMIT 1
                """.trimIndent())
                recipStmt.setString(1, req.recipientId.takeIf { it.length == 36 } ?: UUID.randomUUID().toString())
                recipStmt.setString(2, req.recipientId)
                recipStmt.setString(3, req.recipientId)
                val recipRs = recipStmt.executeQuery()
                if (recipRs.next()) {
                    resolvedRecipientId = recipRs.getString("id")
                } else {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Recipient not found"))
                }

                val refOut = "TRF-OUT-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"
                val refIn = "TRF-IN-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}"

                // Debit sender
                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'transfer_out', ?, 0.00, ?, ?, 'completed', ?, ?)
                """.trimIndent()).apply {
                    setString(1, senderId)
                    setDouble(2, req.amount)
                    setDouble(3, senderBalance)
                    setDouble(4, senderBalance - req.amount)
                    setString(5, refOut)
                    setString(6, "Transfer to recipient: ${req.note ?: ""}")
                    executeUpdate()
                }

                // Credit recipient
                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, status, reference, description)
                    VALUES (?::uuid, 'transfer_in', ?, 0.00, 'completed', ?, ?)
                """.trimIndent()).apply {
                    setString(1, resolvedRecipientId)
                    setDouble(2, req.amount)
                    setString(3, refIn)
                    setString(4, "Transfer from friend: ${req.note ?: ""}")
                    executeUpdate()
                }

                call.respond(SuccessResponse("Transfer of ₦${req.amount.toInt()} successful"))
            } catch (e: Exception) {
                println("[WALLET] Transfer error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Transfer failed", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/settlement-account
        // Save settlement account details (OPay / Bank) from SettingsScreen
        // ============================================================
        post("/settlement-account") {
            val req = try { call.receive<SettlementAccountRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val userId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, userId)

                val stmt = conn.prepareStatement("""
                    UPDATE driver_details
                    SET bank_name = ?, bank_account_number = ?, bank_code = ?, updated_at = now()
                    WHERE user_id = ?::uuid
                """.trimIndent())
                stmt.setString(1, req.bankName)
                stmt.setString(2, req.accountNumber)
                stmt.setString(3, req.bankCode ?: "")
                stmt.setString(4, userId)
                val updated = stmt.executeUpdate()

                if (updated == 0) {
                    // Update user phone or details in profiles as fallback
                    conn.prepareStatement("UPDATE profiles SET phone = ? WHERE id = ?::uuid")
                        .apply { setString(1, req.accountNumber); setString(2, userId); executeUpdate() }
                }

                call.respond(SuccessResponse("Settlement account updated successfully"))
            } catch (e: Exception) {
                println("[WALLET] Settlement account update error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update settlement account", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/deposit/cancel
        // Mark a pending deposit as failed (user cancelled payment)
        // ============================================================
        post("/deposit/cancel") {
            val req = try { call.receive<CancelDepositRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val userId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val updateStmt = conn.prepareStatement("""
                    UPDATE wallet_transactions
                    SET status = 'failed', updated_at = now()
                    WHERE reference = ? AND user_id = ?::uuid AND status = 'pending'
                """.trimIndent())
                updateStmt.setString(1, req.transactionRef)
                updateStmt.setString(2, userId)
                val updated = updateStmt.executeUpdate()

                if (updated > 0) {
                    println("[WALLET] Deposit cancelled by user: tx_ref=${req.transactionRef}, user=$userId")
                    call.respond(SuccessResponse("Deposit cancelled successfully"))
                } else {
                    call.respond(HttpStatusCode.NotFound, ErrorResponse("No pending transaction found"))
                }
            } catch (e: Exception) {
                println("[WALLET] Cancel deposit error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to cancel deposit", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/wallet/deposit/callback
        // Flutterwave redirect URL after payment completion
        // ============================================================
        get("/deposit/callback") {
            val txRef = call.request.queryParameters["tx_ref"]
            val status = call.request.queryParameters["status"] ?: "unknown"

            println("[WALLET] Deposit callback: tx_ref=$txRef, status=$status")

            if (txRef.isNullOrBlank()) {
                return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing transaction reference"))
            }

            val conn = DatabaseService.getConnection()
            try {
                val txStmt = conn.prepareStatement("SELECT id, user_id, amount, fee, status FROM wallet_transactions WHERE reference = ? LIMIT 1")
                txStmt.setString(1, txRef)
                val txRs = txStmt.executeQuery()

                if (!txRs.next()) return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Transaction reference not found"))

                val userId = txRs.getString("user_id")
                val totalAmount = txRs.getDouble("amount")
                val fee = txRs.getDouble("fee")
                val currentStatus = txRs.getString("status")
                val netAmount = totalAmount - fee

                if (currentStatus == "completed") {
                    return@get call.respond(mapOf("status" to "completed", "message" to "Deposit already credited"))
                }

                if (status.equals("successful", ignoreCase = true)) {
                    val balStmt = conn.prepareStatement("SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'")
                    balStmt.setString(1, userId)
                    val balRs = balStmt.executeQuery()
                    val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                    val newBalance = currentBalance + netAmount

                    val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now() WHERE reference = ?")
                    updateStmt.setDouble(1, currentBalance)
                    updateStmt.setDouble(2, newBalance)
                    updateStmt.setString(3, txRef)
                    updateStmt.executeUpdate()

                    println("[WALLET] Wallet credited via callback: user=$userId, amount=$netAmount")
                    call.respond(mapOf("status" to "completed", "message" to "Wallet credited with NGN ${netAmount.toInt()}"))
                } else {
                    val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE reference = ?")
                    updateStmt.setString(1, txRef)
                    updateStmt.executeUpdate()
                    println("[WALLET] Transaction marked failed via callback: tx_ref=$txRef")
                    call.respond(mapOf("status" to "failed", "message" to "Payment not successful"))
                }
            } catch (e: Exception) {
                println("[WALLET] Deposit callback error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Callback processing failed", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/deposit/reconcile
        // Reconcile stale pending deposits with Flutterwave
        // ============================================================
        post("/deposit/reconcile") {
            val conn = DatabaseService.getConnection()
            try {
                val pendingStmt = conn.prepareStatement("SELECT id, reference, user_id, amount, fee FROM wallet_transactions WHERE type = 'deposit' AND status = 'pending' AND created_at < now() - interval '5 minutes' ORDER BY created_at ASC LIMIT 10")
                val pendingRs = pendingStmt.executeQuery()

                val results = buildJsonArray {
                    while (pendingRs.next()) {
                        val txRef = pendingRs.getString("reference")
                        val txId = pendingRs.getString("id")
                        val userId = pendingRs.getString("user_id")
                        val totalAmount = pendingRs.getDouble("amount")
                        val fee = pendingRs.getDouble("fee")
                        val netAmount = totalAmount - fee

                        var flwStatus: String? = null
                        try {
                            val verifyResp = httpClient.get("https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=$txRef") {
                                header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                            }
                            if (verifyResp.status.isSuccess()) {
                                val verifyJson = json.parseToJsonElement(verifyResp.bodyAsText()).jsonObject
                                flwStatus = verifyJson["data"]?.jsonObject?.get("status")?.jsonPrimitive?.contentOrNull
                            }
                        } catch (e: Exception) {
                            println("[WALLET] Reconcile check failed for $txRef: ${e.message}")
                        }

                        val newStatus = when {
                            flwStatus.equals("successful", ignoreCase = true) -> "completed"
                            flwStatus.equals("cancelled", ignoreCase = true) -> "failed"
                            flwStatus.equals("failed", ignoreCase = true) -> "failed"
                            else -> null
                        }

                        if (newStatus != null) {
                            if (newStatus == "completed") {
                                val balStmt = conn.prepareStatement("SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'")
                                balStmt.setString(1, userId)
                                val balRs = balStmt.executeQuery()
                                val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                                val newBalance = currentBalance + netAmount

                                val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now() WHERE id = ?::uuid")
                                updateStmt.setDouble(1, currentBalance)
                                updateStmt.setDouble(2, newBalance)
                                updateStmt.setString(3, txId)
                                updateStmt.executeUpdate()
                            } else {
                                val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
                                updateStmt.setString(1, txId)
                                updateStmt.executeUpdate()
                            }
                        }

                        addJsonObject {
                            put("tx_ref", txRef)
                            put("flutterwave_status", flwStatus)
                            put("new_status", newStatus)
                        }
                    }
                }

        // ============================================================
        // POST /api/wallet/deposit/manual-fix
        // Manually resolve stuck deposits (for cancelled/unsuccessful payments)
        // ============================================================
        post("/deposit/manual-fix") {
            val req = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val txRef = req["transactionRef"]
            val action = req["action"] // "fail" or "complete"

            if (txRef.isNullOrBlank() || action.isNullOrBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing transactionRef or action"))
            }

            if (action != "fail" && action != "complete") {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Action must be 'fail' or 'complete'"))
            }

            val userId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val txStmt = conn.prepareStatement("SELECT id, user_id, amount, fee, status FROM wallet_transactions WHERE reference = ? AND user_id = ?::uuid LIMIT 1")
                txStmt.setString(1, txRef)
                txStmt.setString(2, userId)
                val txRs = txStmt.executeQuery()

                if (!txRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Transaction not found"))
                }

                val txUserId = txRs.getString("user_id")
                val totalAmount = txRs.getDouble("amount")
                val fee = txRs.getDouble("fee")
                val currentStatus = txRs.getString("status")
                val netAmount = totalAmount - fee

                if (currentStatus == "completed") {
                    return@post call.respond(SuccessResponse("Transaction already completed"))
                }

                if (action == "complete") {
                    val balStmt = conn.prepareStatement("SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'")
                    balStmt.setString(1, txUserId)
                    val balRs = balStmt.executeQuery()
                    val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                    val newBalance = currentBalance + netAmount

                    val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now() WHERE reference = ?")
                    updateStmt.setDouble(1, currentBalance)
                    updateStmt.setDouble(2, newBalance)
                    updateStmt.setString(3, txRef)
                    val updated = updateStmt.executeUpdate()

                    if (updated > 0) {
                        call.respond(SuccessResponse("Deposit completed successfully. ₦${netAmount.toInt()} credited to wallet."))
                    } else {
                        call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update transaction"))
                    }
                } else {
                    val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE reference = ?")
                    updateStmt.setString(1, txRef)
                    val updated = updateStmt.executeUpdate()

                    if (updated > 0) {
                        call.respond(SuccessResponse("Deposit marked as failed/cancelled."))
                    } else {
                        call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update transaction"))
                    }
                }
            } catch (e: Exception) {
                println("[WALLET] Manual fix error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Manual fix failed", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
