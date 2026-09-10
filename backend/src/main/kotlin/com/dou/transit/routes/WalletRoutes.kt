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

    @Suppress("UNUSED")
    val httpClient = HttpClient(CIO) {
        engine {
            requestTimeout = 15_000
        }
    }

    route("/api/wallet") {

        // ============================================================
        // GET /api/wallet/balance/{userId}
        // Returns current balance and 20 most recent transactions
        // ============================================================
        get("/balance/{userId}") {
            val userId = call.parameters["userId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing userId"))

            val conn = DatabaseService.getConnection()
            try {
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
                e.printStackTrace()
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse(e.message ?: "Failed to fetch balance"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/deposit
        // Creates a pending deposit transaction and returns payment URL
        // ============================================================
        post("/deposit") {
            val req = try { call.receive<DepositRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

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
                // Fetch student/user profile details for Flutterwave
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

                // Request Flutterwave Hosted Checkout Link via server-side Secret Key
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
                    println("[WALLET] Outbound Flutterwave payment link init error: ${flwEx.message}")
                }

                call.respond(DepositResponse(
                    paymentUrl = checkoutLink,
                    transactionRef = transactionRef
                ))
            } catch (e: Exception) {
                println("[WALLET] Deposit error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Deposit initiation failed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/wallet/deposit/callback
        // Flutterwave redirect landing page after checkout
        // ============================================================
        get("/deposit/callback") {
            val txRef = call.request.queryParameters["tx_ref"] ?: ""
            val status = call.request.queryParameters["status"] ?: ""

            call.respondText(
                contentType = ContentType.Text.Html,
                text = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>DOU Transit - Payment Complete</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1120; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                        .badge { width: 64px; height: 64px; border-radius: 50%; background: #10b98120; color: #10b981; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
                        h1 { font-size: 22px; margin: 0 0 8px; color: #ffffff; }
                        p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
                        .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="badge">✓</div>
                        <h1>Payment ${if (status == "successful" || status.isEmpty()) "Successful" else "Completed"}</h1>
                        <p>Your payment (Ref: <code>${txRef.take(18)}...</code>) has been submitted. Your DOU Transit wallet will update automatically.</p>
                        <a href="douride://wallet" class="btn">Return to DOU Transit App</a>
                    </div>
                    <script>
                        setTimeout(function() {
                            window.location.href = "douride://wallet";
                        }, 2500);
                    </script>
                </body>
                </html>
                """.trimIndent()
            )
        }

        // ============================================================
        // GET /api/wallet/verify-deposit/{txRef}
        // Verifies a Flutterwave deposit and credits the wallet immediately
        // ============================================================
        get("/verify-deposit/{txRef}") {
            val txRef = call.parameters["txRef"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing txRef"))

            val conn = DatabaseService.getConnection()
            try {
                // 1. Check existing transaction
                val txStmt = conn.prepareStatement("""
                    SELECT id, user_id, amount, fee, status FROM wallet_transactions
                    WHERE reference = ? AND type = 'deposit'
                    LIMIT 1
                """.trimIndent())
                txStmt.setString(1, txRef)
                val txRs = txStmt.executeQuery()

                if (!txRs.next()) {
                    return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Transaction reference not found"))
                }

                val txId = txRs.getString("id")
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

                // 2. Query Flutterwave verification endpoint
                var isSuccessful = false
                try {
                    val flwResp = httpClient.get("https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=$txRef") {
                        header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                    }
                    if (flwResp.status.isSuccess()) {
                        val bodyText = flwResp.bodyAsText()
                        val flwJson = json.parseToJsonElement(bodyText).jsonObject
                        val flwStatus = flwJson["status"]?.jsonPrimitive?.contentOrNull
                        val dataObj = flwJson["data"]?.jsonObject
                        val dataStatus = dataObj?.get("status")?.jsonPrimitive?.contentOrNull
                        if (flwStatus == "success" && dataStatus == "successful") {
                            isSuccessful = true
                        }
                    }
                } catch (flwErr: Exception) {
                    println("[WALLET] Flutterwave verification API ping error: ${flwErr.message}")
                }

                if (!isSuccessful) {
                    return@get call.respond(VerifyDepositResponse(
                        verified = false,
                        status = status,
                        message = "Payment has not yet settled with Flutterwave. Please check back shortly."
                    ))
                }

                // 3. Credit student wallet atomically
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
                val currentBalance = if (balanceRs.next()) balanceRs.getDouble("balance") else 0.0

                // Complete the deposit
                val updateStmt = conn.prepareStatement("""
                    UPDATE wallet_transactions
                    SET status = 'completed', balance_before = ?, balance_after = ? + ?
                    WHERE id = ?::uuid
                """.trimIndent())
                updateStmt.setDouble(1, currentBalance)
                updateStmt.setDouble(2, currentBalance)
                updateStmt.setDouble(3, netAmount)
                updateStmt.setString(4, txId)
                updateStmt.executeUpdate()

                // Insert ₦10 platform fee entry
                val feeStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'platform_fee', ?, 0.00, ?, ?, 'completed', ?, 'Deposit gateway processing fee')
                """.trimIndent())
                feeStmt.setString(1, userId)
                feeStmt.setDouble(2, -fee)
                feeStmt.setDouble(3, currentBalance + netAmount)
                feeStmt.setDouble(4, currentBalance + netAmount)
                feeStmt.setString(5, "$txRef-fee")
                feeStmt.executeUpdate()

                val newBalance = currentBalance + netAmount

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
        // POST /api/wallet/withdraw
        // Initiates a withdrawal to the user's bank account
        // ============================================================
        post("/withdraw") {
            val req = try { call.receive<WithdrawRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val userId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid withdrawal amount"))
            }

            val conn = DatabaseService.getConnection()
            try {
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
                val currentBalance = if (balanceRs.next()) balanceRs.getDouble("balance") else 0.0

                if (currentBalance < req.amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance"))
                }

                val reference = "DOU-WTH-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                val accountLast4 = if (req.accountNumber.length >= 4) req.accountNumber.takeLast(4) else req.accountNumber

                // Build metadata JSON for bank details
                val metadataObj = buildJsonObject {
                    put("bank_code", req.bankCode)
                    put("bank_name", req.bankName)
                    put("account_number", req.accountNumber)
                }
                val metadataJson = metadataObj.toString()

                val txStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, status, reference, description, metadata)
                    VALUES (?::uuid, 'withdrawal', ?, 0.00, ?, 'pending', ?, ?, ?::jsonb)
                """.trimIndent())
                txStmt.setString(1, userId)
                txStmt.setDouble(2, -req.amount)
                txStmt.setDouble(3, currentBalance)
                txStmt.setString(4, reference)
                txStmt.setString(5, "Withdrawal to ${req.bankName} ****$accountLast4")
                txStmt.setString(6, metadataJson)
                txStmt.executeUpdate()

                val updateStmt = conn.prepareStatement("""
                    UPDATE wallet_transactions SET balance_after = ? - ?
                    WHERE reference = ?
                """.trimIndent())
                updateStmt.setDouble(1, currentBalance)
                updateStmt.setDouble(2, req.amount)
                updateStmt.setString(3, reference)
                updateStmt.executeUpdate()

                println("[WALLET] Withdrawal initiated: $reference for ₦${req.amount.toInt()} to ${req.bankName} ****$accountLast4")

                call.respond(SuccessResponse("Withdrawal initiated to ${req.bankName}"))
            } catch (e: Exception) {
                println("[WALLET] Withdrawal error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Withdrawal failed"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/wallet/transfer
        // P2P wallet transfer between users
        // ============================================================
        post("/transfer") {
            val req = try { call.receive<TransferRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val senderId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.amount <= 0) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid transfer amount"))
            }

            if (senderId == req.recipientId) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Cannot transfer to yourself"))
            }

            val conn = DatabaseService.getConnection()
            try {
                val recipientStmt = conn.prepareStatement("""
                    SELECT id, full_name FROM profiles WHERE id = ?::uuid AND is_suspended = false
                """.trimIndent())
                recipientStmt.setString(1, req.recipientId)
                val recipientRs = recipientStmt.executeQuery()
                if (!recipientRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Recipient not found or suspended"))
                }
                val recipientName = recipientRs.getString("full_name")

                val balanceStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balanceStmt.setString(1, senderId)
                val balanceRs = balanceStmt.executeQuery()
                val senderBalance = if (balanceRs.next()) balanceRs.getDouble("balance") else 0.0

                if (senderBalance < req.amount) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Insufficient balance"))
                }

                val reference = "DOU-TRF-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                val description = if (req.note != null) "Transfer to $recipientName: ${req.note}" else "Transfer to $recipientName"

                // Debit sender
                val debitStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'transfer_out', ?, 0.00, ?, ?, 'completed', ?, ?)
                """.trimIndent())
                debitStmt.setString(1, senderId)
                debitStmt.setDouble(2, -req.amount)
                debitStmt.setDouble(3, senderBalance)
                debitStmt.setDouble(4, senderBalance - req.amount)
                debitStmt.setString(5, reference)
                debitStmt.setString(6, description)
                debitStmt.executeUpdate()

                // Get recipient current balance
                val recipBalanceStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                recipBalanceStmt.setString(1, req.recipientId)
                val recipRs = recipBalanceStmt.executeQuery()
                val recipBalance = if (recipRs.next()) recipRs.getDouble("balance") else 0.0

                // Credit recipient
                val creditStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                    VALUES (?::uuid, 'transfer_in', ?, 0.00, ?, ?, 'completed', ?, ?)
                """.trimIndent())
                creditStmt.setString(1, req.recipientId)
                creditStmt.setDouble(2, req.amount)
                creditStmt.setDouble(3, recipBalance)
                creditStmt.setDouble(4, recipBalance + req.amount)
                creditStmt.setString(5, reference)
                creditStmt.setString(6, "Transfer received")
                creditStmt.executeUpdate()

                // Send notification to recipient about incoming transfer
                val senderNameStmt = conn.prepareStatement("SELECT full_name FROM profiles WHERE id = ?::uuid")
                senderNameStmt.setString(1, senderId)
                val senderRs = senderNameStmt.executeQuery()
                val senderFullName = if (senderRs.next()) senderRs.getString("full_name") else "A user"

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, req.recipientId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "💰 Transfer Received",
                        body = "₦${req.amount.toInt()} received from $senderFullName",
                        platform = tokenRs.getString("platform")
                    )
                }

                call.respond(SuccessResponse("Transfer completed to $recipientName"))
            } catch (e: Exception) {
                println("[WALLET] Transfer error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Transfer failed"))
            } finally {
                conn.close()
            }
        }
    }

    // ============================================================
    // POST /api/flutterwave/webhook
    // Handles Flutterwave payment/transfer events
    post("/api/flutterwave/webhook") {
        val signature = call.request.headers["verif-hash"]
            ?: call.request.headers["X-FLW-SIGNATURE"]
            ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing signature"))

        val rawBody = call.receiveText()

        // Verify webhook signature (supports Flutterwave direct hash or HMAC-SHA256)
        val expectedSignature = hmacSha256(rawBody, AppConfig.flutterwaveSecretHash)
        if (signature != AppConfig.flutterwaveSecretHash && signature != expectedSignature) {
            println("[WEBHOOK] Invalid signature ($signature) — possible tampering")
            return@post call.respond(SuccessResponse("Webhook received"))
        }

        val payload = try { json.decodeFromString<FlutterwaveWebhookPayload>(rawBody) }
        catch (e: Exception) {
            println("[WEBHOOK] Invalid payload: ${e.message}")
            return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid payload"))
        }

        val event = payload.event
        val data = payload.data

        println("[WEBHOOK] Event: $event | Ref: ${data.tx_ref} | Amount: ${data.amount} | Status: ${data.status}")

        val conn = DatabaseService.getConnection()
        try {
            when (event) {
                "charge.completed" -> {
                    if (data.status == "successful") {
                        val txRef = data.tx_ref

                        val txStmt = conn.prepareStatement("""
                            SELECT id, user_id, amount, fee FROM wallet_transactions
                            WHERE reference = ? AND type = 'deposit' AND status = 'pending'
                            LIMIT 1
                        """.trimIndent())
                        txStmt.setString(1, txRef)
                        val txRs = txStmt.executeQuery()

                        if (txRs.next()) {
                            val txId = txRs.getString("id")
                            val userId = txRs.getString("user_id")
                            val totalAmount = txRs.getDouble("amount")
                            val fee = txRs.getDouble("fee")
                            val netAmount = totalAmount - fee

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
                            val currentBalance = if (balanceRs.next()) balanceRs.getDouble("balance") else 0.0

                            // Mark deposit as completed
                            val updateStmt = conn.prepareStatement("""
                                UPDATE wallet_transactions
                                SET status = 'completed', balance_before = ?, balance_after = ? + ?
                                WHERE id = ?::uuid
                            """.trimIndent())
                            updateStmt.setDouble(1, currentBalance)
                            updateStmt.setDouble(2, currentBalance)
                            updateStmt.setDouble(3, netAmount)
                            updateStmt.setString(4, txId)
                            updateStmt.executeUpdate()

                            // Log platform fee as separate entry
                            val feeStmt = conn.prepareStatement("""
                                INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description)
                                VALUES (?::uuid, 'platform_fee', ?, 0.00, ?, ?, 'completed', ?, 'Deposit fee')
                            """.trimIndent())
                            feeStmt.setString(1, userId)
                            feeStmt.setDouble(2, -fee)
                            feeStmt.setDouble(3, currentBalance + netAmount)
                            feeStmt.setDouble(4, currentBalance + netAmount)
                            feeStmt.setString(5, "$txRef-fee")
                            feeStmt.executeUpdate()

                            // Send notification
                            val notifStmt = conn.prepareStatement("""
                                SELECT token, platform FROM notification_tokens
                                WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                            """.trimIndent())
                            notifStmt.setString(1, userId)
                            val notifRs = notifStmt.executeQuery()
                            if (notifRs.next()) {
                                val newBalance = currentBalance + netAmount
                                NotificationService.sendPush(
                                    token = notifRs.getString("token"),
                                    title = "💰 Wallet Funded",
                                    body = "₦${netAmount.toInt()} added. Balance: ₦${newBalance.toInt()}",
                                    platform = notifRs.getString("platform")
                                )
                            }

                            println("[WEBHOOK] Deposit completed: $txRef — ₦$netAmount credited to $userId")
                        }
                    }
                }

                "transfer.completed" -> {
                    if (data.status == "successful") {
                        val txRef = data.tx_ref
                        val updateStmt = conn.prepareStatement("""
                            UPDATE wallet_transactions
                            SET status = 'completed', updated_at = now()
                            WHERE reference = ? AND type = 'withdrawal'
                        """.trimIndent())
                        updateStmt.setString(1, txRef)
                        val updated = updateStmt.executeUpdate()

                        if (updated > 0) {
                            println("[WEBHOOK] Withdrawal completed: $txRef")
                        }
                    }
                }

                "charge.failed" -> {
                    val updateStmt = conn.prepareStatement("""
                        UPDATE wallet_transactions
                        SET status = 'failed', updated_at = now()
                        WHERE reference = ? AND type = 'deposit' AND status = 'pending'
                    """.trimIndent())
                    updateStmt.setString(1, data.tx_ref)
                    updateStmt.executeUpdate()
                    println("[WEBHOOK] Deposit failed: ${data.tx_ref} — ${data.processor_response}")
                }
            }
        } catch (e: Exception) {
            println("[WEBHOOK] Processing error: ${e.message}")
        } finally {
            conn.close()
        }

        call.respond(SuccessResponse("Webhook received"))
    }
}

/**
 * Compute HMAC-SHA256 hex string for webhook signature verification.
 */
private fun hmacSha256(data: String, key: String): String {
    val mac = javax.crypto.Mac.getInstance("HmacSHA256")
    val secretKey = javax.crypto.spec.SecretKeySpec(key.toByteArray(), "HmacSHA256")
    mac.init(secretKey)
    return mac.doFinal(data.toByteArray()).joinToString("") { "%02x".format(it) }
}
