package com.dou.transit.routes

import com.dou.transit.config.AppConfig
import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.client.*
import io.ktor.client.engine.cio.*
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

                val transactions = mutableListOf<Map<String, Any?>>()
                while (txRs.next()) {
                    transactions.add(mapOf(
                        "id" to txRs.getString("id"),
                        "type" to txRs.getString("type"),
                        "amount" to txRs.getDouble("amount"),
                        "fee" to txRs.getDouble("fee"),
                        "balance_before" to txRs.getDouble("balance_before"),
                        "balance_after" to txRs.getDouble("balance_after"),
                        "status" to txRs.getString("status"),
                        "reference" to txRs.getString("reference"),
                        "description" to txRs.getString("description"),
                        "created_at" to txRs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(mapOf(
                    "balance" to balance,
                    "pendingBalance" to pendingBalance,
                    "transactions" to transactions
                ))
            } catch (e: Exception) {
                println("[WALLET] Error fetching balance: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch balance"))
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
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val totalAmount = req.amount + AppConfig.platformFeeNaira
            val transactionRef = "DOU-DEP-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"

            val conn = DatabaseService.getConnection()
            try {
                val txStmt = conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, status, reference, description)
                    VALUES (?::uuid, 'deposit', ?, ?, 'pending', ?, 'Wallet deposit via Flutterwave')
                """.trimIndent())
                txStmt.setString(1, userId)
                txStmt.setDouble(2, totalAmount)
                txStmt.setDouble(3, AppConfig.platformFeeNaira)
                txStmt.setString(4, transactionRef)
                txStmt.executeUpdate()

                call.respond(DepositResponse(
                    paymentUrl = "https://api.flutterwave.com/v3/payments",
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
    // ============================================================
    post("/api/flutterwave/webhook") {
        val signature = call.request.headers["X-FLW-SIGNATURE"]
            ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Missing signature"))

        val rawBody = call.receiveText()

        // Verify webhook signature using HMAC-SHA256
        val expectedSignature = hmacSha256(rawBody, AppConfig.flutterwaveSecretHash)
        if (signature != expectedSignature) {
            println("[WEBHOOK] Invalid signature — possible tampering")
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
