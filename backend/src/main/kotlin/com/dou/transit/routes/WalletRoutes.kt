package com.dou.transit.routes

import com.dou.transit.config.AppConfig
import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.EgressIpManager
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
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount - fee
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
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount - fee
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, userId)
                val balRs = balStmt.executeQuery()
                val completedBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                // AUTO-CLEAR: fail this user's stale pending withdrawals (>10 min)
            // before creating a new one, so a stuck one never blocks them.
            // Pending rows reserve NO money (balance counts completed only),
            // so failing them is safe — the old attempt is dead by definition.
            // NOTE: pending result check below also fails/recovers stale pendings
            // from THIS user automatically, no manual SQL needed.
            val clearStmt = conn.prepareStatement(
                "UPDATE wallet_transactions SET status = 'failed', updated_at = now() " +
                "WHERE user_id = ?::uuid AND type = 'withdrawal' AND status = 'pending' " +
                "AND created_at < now() - interval '10 minutes'"
            )
            clearStmt.setString(1, userId)
            val clearedCount = clearStmt.executeUpdate()
            if (clearedCount > 0) {
                println("[WITHDRAW] Auto-cleared $clearedCount stale pending withdrawals for user $userId")
            }

            // PENDING != RESERVED: a pending row means "provider not yet
            // confirmed", not "money gone". Check OUR fresh pendings against
            // Flutterwave first: unknown reference => money never moved, so
            // fail it free instead of blocking the user. Only genuinely
            // in-flight amounts reserve funds.
            var inFlightPending = 0.0
            try {
                val ownStmt = conn.prepareStatement(
                    "SELECT id, reference, amount FROM wallet_transactions " +
                    "WHERE user_id = ?::uuid AND type = 'withdrawal' AND status = 'pending' " +
                    "ORDER BY created_at ASC LIMIT 5"
                )
                ownStmt.setString(1, userId)
                val ownRs = ownStmt.executeQuery()
                val ownList = mutableListOf<Triple<String, String, Double>>()
                while (ownRs.next()) ownList.add(Triple(ownRs.getString("id"), ownRs.getString("reference"), ownRs.getDouble("amount")))
                for ((ownId, ownRef, ownAmt) in ownList) {
                    try {
                        val pollResp = httpClient.get("https://api.flutterwave.com/v3/transfers?reference=" + ownRef) {
                            header(HttpHeaders.Authorization, "Bearer " + AppConfig.flutterwaveSecretKey)
                        }
                        val pollText = pollResp.bodyAsText()
                        var hasRecord = false
                        var fwState: String? = null
                        if (pollResp.status.isSuccess()) {
                            try {
                                val pj = json.parseToJsonElement(pollText).jsonObject
                                val arr = pj["data"]?.jsonArray
                                if (arr != null && arr.size > 0) {
                                    hasRecord = true
                                    fwState = arr[0].jsonObject["status"]?.jsonPrimitive?.contentOrNull?.uppercase()
                                }
                            } catch (_: Exception) { hasRecord = false }
                        } else {
                            val low = pollText.lowercase()
                            if (low.contains("no record") || low.contains("not found") || low.contains("unknown reference") || low.contains("does not exist")) {
                                val u = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
                                u.setString(1, ownId); u.executeUpdate()
                                println("[WITHDRAW] Auto-failed " + ownRef + ": provider unknown ref")
                                continue
                            } else {
                                inFlightPending += ownAmt
                                continue
                            }
                        }
                        if (!hasRecord) {
                            val u = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
                            u.setString(1, ownId); u.executeUpdate()
                            println("[WITHDRAW] Auto-failed " + ownRef + ": no provider record")
                        } else if (fwState == "SUCCESSFUL") {
                            val u = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', updated_at = now() WHERE id = ?::uuid")
                            u.setString(1, ownId); u.executeUpdate()
                            println("[WITHDRAW] Recovered " + ownRef + " as COMPLETED")
                        } else if (fwState == "FAILED" || fwState == "REJECTED" || fwState == "CANCELLED") {
                            val u = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
                            u.setString(1, ownId); u.executeUpdate()
                            println("[WITHDRAW] Recovered " + ownRef + " as FAILED (" + fwState + ")")
                        } else {
                            inFlightPending += ownAmt
                        }
                    } catch (_: Exception) {
                        inFlightPending += ownAmt
                    }
                }
            } catch (e: Exception) {
                println("[WITHDRAW] Own-pending check failed: " + e.message)
            }
            val pendingAmount = inFlightPending

                val availableBalance = completedBalance - pendingAmount

                if (availableBalance < req.amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient wallet balance. Available: ₦${availableBalance.toInt()}, Pending: ₦${pendingAmount.toInt()}"))
                }

                val reference = "DOU-WTH-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                val newBalance = completedBalance - req.amount - pendingAmount

                if (AppConfig.flutterwaveSecretKey.isBlank() || AppConfig.flutterwaveSecretKey.contains("TEST", ignoreCase = true)) {
                    println("[WITHDRAW] REFUSED $reference: FLUTTERWAVE_SECRET_KEY missing or test key (len=${AppConfig.flutterwaveSecretKey.length})")
                    return@post call.respond(
                        HttpStatusCode.ServiceUnavailable,
                        ErrorResponse(
                            "Withdrawals unavailable",
                            "Payout provider is not configured with a LIVE secret key on the server. Set FLUTTERWAVE_SECRET_KEY (live, no TEST) in Render env and redeploy — no money was debited."
                        )
                    )
                }

                // Flutterwave REQUIRES IP whitelisting on the dashboard for the
                // v3 Transfers API (live keys). If their server rejects our
                // request, surface a clear "whitelist your server IP" message
                // instead of a generic "Withdrawal failed" so the user knows
                // exactly what to fix.

                val txStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                    VALUES (?::uuid, 'withdrawal', ?, 0.00, ?, ?, 'pending', ?, ?, ?::jsonb)
                """.trimIndent())
                txStmt.setString(1, userId)
                txStmt.setDouble(2, req.amount)
                txStmt.setDouble(3, availableBalance)
                txStmt.setDouble(4, newBalance)
                txStmt.setString(5, reference)
                txStmt.setString(6, "Withdrawal to ${req.bankName ?: "Bank"} (${req.accountNumber})")
                txStmt.setString(7, """{"accountNumber":"${req.accountNumber}","bankCode":"${req.bankCode}","bankName":"${req.bankName ?: ""}"}""")
                txStmt.executeUpdate()

                // Normalize bank code: app ships 6-digit NIP codes (000033)
                // but Flutterwave expects its own codes (e.g. 999992 for OPay).
                // Map the known fintech aliases before calling the API.
                val fwBankCode = mapOf(
                    "000033" to "999992",  // OPay Digital Services (Flutterwave code)
                    "000034" to "999995",  // PalmPay
                    "000031" to "999991",  // Moniepoint MFB
                    "000032" to "999992",  // Kuda (fallback rail)
                    "999992" to "999992",
                    "999995" to "999995",
                    "999991" to "999991"
                )[req.bankCode] ?: req.bankCode
                if (fwBankCode != req.bankCode) {
                    println("[WITHDRAW] Normalized bank code ${req.bankCode} -> $fwBankCode for $reference")
                }

                // PRE-CHECK: verify Flutterwave has sufficient NGN balance
                // BEFORE attempting the transfer. If their wallet is empty or
                // low, we surface "insufficient funds" instead of a cryptic
                // "Transfer creation failed" — and we do NOT mark the user's
                // withdrawal as pending (no money was attempted).
                val ngnBalance: Double? = try {
                    val balClient = HttpClient(CIO) { engine { requestTimeout = 10_000 } }
                    val balResp = balClient.get("https://api.flutterwave.com/v3/balances/NGN") {
                        header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                    }
                    val balText = balResp.bodyAsText()
                    balClient.close()
                    println("[WITHDRAW] Flutterwave NGN balance check HTTP ${balResp.status.value}: ${balText.take(200)}")
                    if (balResp.status.isSuccess()) {
                        Json { ignoreUnknownKeys = true }.parseToJsonElement(balText)
                            .jsonObject["data"]?.jsonObject?.get("available_balance")
                            ?.jsonPrimitive?.contentOrNull?.toDoubleOrNull()
                    } else null
                } catch (e: Exception) {
                    println("[WITHDRAW] Flutterwave balance check failed: ${e.message}")
                    null
                }
                if (ngnBalance != null && ngnBalance < req.amount) {
                    println("[WITHDRAW] REFUSED $reference: Flutterwave NGN balance ₦${ngnBalance.toInt()} < withdrawal ₦${req.amount.toInt()}")
                    return@post call.respond(
                        HttpStatusCode.ServiceUnavailable,
                        ErrorResponse(
                            "Withdrawal provider has insufficient funds",
                            "The payout provider's NGN balance (₦${ngnBalance.toInt()}) is less than the withdrawal amount (₦${req.amount.toInt()}). Fund the Flutterwave NGN wallet and retry — no money was debited from your wallet."
                        )
                    )
                }

                // Attempt the Flutterwave transfer NOW (synchronously) so the
                // user gets an immediate completed/failed result instead of a
                // withdrawal stuck at "pending" forever when the background
                // job can't reach Flutterwave.
                var finalStatus = "pending"
                var transferId: String? = null
                var failReason: String? = null
                var fwDebug: String? = null
                try {
                    val payload = buildJsonObject {
                        put("account_bank", fwBankCode)
                        put("account_number", req.accountNumber)
                        put("amount", req.amount.toInt())
                        put("currency", "NGN")
                        put("reference", reference)
                        put("narration", "DOU Transit Wallet Withdrawal")
                        put("callback_url", "${AppConfig.baseUrl}/api/wallet/transfer/webhook")
                    }
                    val resp = httpClient.post("https://api.flutterwave.com/v3/transfers") {
                        header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                        contentType(ContentType.Application.Json)
                        setBody(payload.toString())
                    }
                    val bodyText = resp.bodyAsText()
                    fwDebug = "HTTP ${resp.status.value}: ${bodyText.take(300)}"
                    // Log the FULL Flutterwave response server-side for debugging.
                    println("[WITHDRAW] Flutterwave full response for $reference: $bodyText")
                    val bodyJson = try { json.parseToJsonElement(bodyText).jsonObject } catch (e: Exception) { null }
                    if (resp.status.isSuccess() && bodyJson?.get("status")?.jsonPrimitive?.contentOrNull == "success") {
                        finalStatus = "completed"
                        transferId = bodyJson["data"]?.jsonObject?.get("id")?.toString()?.trim('"')
                    } else if (resp.status.value in 500..599) {
                        // Server-side blip — leave pending for background retry.
                        finalStatus = "pending"
                        failReason = "Flutterwave 5xx, will retry"
                    } else {
                        finalStatus = "failed"
                        failReason = bodyJson?.get("message")?.jsonPrimitive?.contentOrNull ?: "HTTP ${resp.status.value}"
                        // Flutterwave returns "Please enable IP Whitelisting
                        // to access this service" (HTTP 400) when the live key
                        // has no IPs whitelisted on its dashboard. Surface a
                        // clear dashboard-fix message with the CURRENT egress IP
                        // so the user always knows exactly what to whitelist,
                        // even if the IP changes over time (Render shared tier).
                        if (failReason.contains("IP Whitelist", ignoreCase = true)) {
                            val ip = EgressIpManager.currentIpOrResolve()
                            failReason = if (ip != null) {
                                "Withdrawal provider requires IP whitelisting. Whitelist this server's IP $ip on the Flutterwave dashboard (Settings > API > IP Whitelist), then retry."
                            } else {
                                "Withdrawal provider requires IP whitelisting. On the Flutterwave dashboard go to Settings > API and add the server's outgoing IP (Render) to the API IP whitelist, then retry — or contact Flutterwave support."
                            }
                        }
                    }
                    if (transferId != null || finalStatus != "pending") {
                        val upd = conn.prepareStatement("UPDATE wallet_transactions SET status = ?, transfer_id = ?, description = ?, updated_at = now() WHERE reference = ?")
                        upd.setString(1, finalStatus)
                        upd.setString(2, transferId)
                        upd.setString(3, "Withdrawal to ${req.bankName ?: "Bank"} (${req.accountNumber})" + (if (finalStatus == "failed") " — FAILED: $failReason" else ""))
                        upd.setString(4, reference)
                        upd.executeUpdate()
                    }
                    println("[WITHDRAW] $reference -> $finalStatus (transferId=$transferId, reason=$failReason, fw=$fwDebug)")
                } catch (e: Exception) {
                    // Network/timeout — leave as pending; background job retries.
                    println("[WITHDRAW] $reference network error, leaving pending for retry: ${e.message}")
                }

                when (finalStatus) {
                    "completed" -> call.respond(SuccessResponse("Withdrawal of NGN ${req.amount.toInt()} sent successfully"))
                    "failed" -> call.respond(HttpStatusCode.BadRequest, ErrorResponse("Withdrawal failed", failReason ?: "Transfer rejected by provider"))
                    else -> call.respond(SuccessResponse("Withdrawal request submitted successfully"))
                }
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
        // Save bank account details for any user (students, drivers, etc.)
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

                // Save bank details to profiles table (works for all users)
                val stmt = conn.prepareStatement("""
                    UPDATE profiles
                    SET bank_name = ?, bank_account_number = ?, bank_code = ?, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent())
                stmt.setString(1, req.bankName)
                stmt.setString(2, req.accountNumber)
                stmt.setString(3, req.bankCode ?: "")
                stmt.setString(4, userId)
                stmt.executeUpdate()

                // Also update driver_details if user is a driver (for backward compatibility)
                val driverStmt = conn.prepareStatement("""
                    UPDATE driver_details
                    SET bank_name = ?, bank_account_number = ?, bank_code = ?, updated_at = now()
                    WHERE user_id = ?::uuid
                """.trimIndent())
                driverStmt.setString(1, req.bankName)
                driverStmt.setString(2, req.accountNumber)
                driverStmt.setString(3, req.bankCode ?: "")
                driverStmt.setString(4, userId)
                driverStmt.executeUpdate()

                call.respond(SuccessResponse("Bank details saved successfully"))
            } catch (e: Exception) {
                println("[WALLET] Settlement account update error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to save bank details", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/verify-account
        // Verify bank account number using Flutterwave API
        // ============================================================
        post("/verify-account") {
            val req = try { call.receive<Map<String, String>>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val accountNumber = req["accountNumber"] ?: ""
            val bankCode = req["bankCode"] ?: ""

            if (accountNumber.length != 10 || bankCode.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid account number or bank code"))
            }

            if (AppConfig.flutterwaveSecretKey.isBlank()) {
                println("[VERIFY] REFUSED: FLUTTERWAVE_SECRET_KEY missing on server")
                return@post call.respond(
                    HttpStatusCode.ServiceUnavailable,
                    ErrorResponse("Verification unavailable", "Server payout key is missing. Set FLUTTERWAVE_SECRET_KEY (live) in Render env and redeploy.")
                )
            }

            // Normalize app-side NIP codes (000033 etc.) to Flutterwave bank codes.
            val fwBankCode = mapOf(
                "000033" to "999992",  // OPay Digital Services
                "000034" to "999995",  // PalmPay
                "000031" to "999991",  // Moniepoint MFB
                "000032" to "044",     // Access Bank (closest supported; Kuda unsupported by FW)
                "999992" to "999992",
                "999995" to "999995",
                "999991" to "999991"
            )[bankCode.trim()] ?: bankCode.trim()

            // PRE-CHECK: fetch live NGN balance so failures return
            // "insufficient funds" instead of a cryptic verification error.
            val ngnBalance: Double? = try {
                val httpClient = HttpClient(CIO)
                val balResp = httpClient.get("https://api.flutterwave.com/v3/balances/NGN") {
                    header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                }
                val balText = balResp.bodyAsText()
                println("[VERIFY] NGN balance check HTTP ${balResp.status.value}: ${balText.take(300)}")
                httpClient.close()
                if (balResp.status.isSuccess()) {
                    Json { ignoreUnknownKeys = true }.parseToJsonElement(balText)
                        .jsonObject["data"]?.jsonObject?.get("available_balance")
                        ?.jsonPrimitive?.contentOrNull?.toDoubleOrNull()
                } else null
            } catch (e: Exception) {
                println("[VERIFY] NGN balance check failed: ${e.message}")
                null
            }

            try {
                val httpClient = HttpClient(CIO)
                val verifyPayload = buildJsonObject {
                    put("account_number", JsonPrimitive(accountNumber.trim()))
                    put("account_bank", JsonPrimitive(fwBankCode))
                }

                println("[VERIFY] Calling Flutterwave API with payload: $verifyPayload")
                val verifyResp = httpClient.post("https://api.flutterwave.com/v3/accounts/resolve") {
                    header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                    contentType(ContentType.Application.Json)
                    setBody(verifyPayload.toString())
                }

                println("[VERIFY] Flutterwave response status: ${verifyResp.status}")
                val responseBodyText = verifyResp.bodyAsText()
                println("[VERIFY] Flutterwave response body: $responseBodyText")

                if (verifyResp.status.isSuccess()) {
                    val json = Json { ignoreUnknownKeys = true }
                    val responseJson = json.parseToJsonElement(responseBodyText).jsonObject
                    val status = responseJson["status"]?.jsonPrimitive?.contentOrNull
                    val message = responseJson["message"]?.jsonPrimitive?.contentOrNull
                    val data = responseJson["data"]?.jsonObject
                    val accountName = data?.get("account_name")?.jsonPrimitive?.contentOrNull
                    val resolvedAccountNumber = data?.get("account_number")?.jsonPrimitive?.contentOrNull

                    println("[VERIFY] Parsed status: $status, message: $message, accountName: $accountName")

                    if (status == "success" && accountName != null) {
                        call.respond(buildJsonObject {
                            put("accountName", accountName)
                            put("accountNumber", resolvedAccountNumber)
                        })
                    } else {
                        call.respond(HttpStatusCode.BadRequest, ErrorResponse("Could not verify account", message ?: "Account not found or bank not supported"))
                    }
                } else {
                    val lower = responseBodyText.lowercase()
                    if (lower.contains("ip whitelist")) {
                        val ip = EgressIpManager.currentIpOrResolve()
                        val ipMsg = if (ip != null) " Whitelist this server's IP $ip." else " Whitelist the server's outgoing IP (Render)."
                        call.respond(HttpStatusCode.ServiceUnavailable, ErrorResponse("Verification unavailable", "Flutterwave requires IP whitelisting for this live key. On the Flutterwave dashboard go to Settings > API and whitelist the server's outgoing IP (Render).$ipMsg"))
                    } else {
                        call.respond(HttpStatusCode.BadRequest, ErrorResponse("Verification failed", "Flutterwave API returned ${verifyResp.status}: $responseBodyText"))
                    }
                }
                httpClient.close()
            } catch (e: Exception) {
                println("[VERIFY] Account verification error: ${e.message}")
                e.printStackTrace()
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Verification failed", e.message))
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

                call.respond(buildJsonObject {
                    put("reconciled", results.size)
                    put("results", results)
                })
            } catch (e: Exception) {
                println("[WALLET] Reconcile error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Reconciliation failed", e.message))
            } finally {
                conn.close()
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
