package com.dou.transit

import com.dou.transit.config.AppConfig
import com.dou.transit.services.DatabaseService
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Auto-clears pending withdrawals that have been stuck for more than 10 minutes.
 * NOTE: only orphaned OLD pendings are failed here. The /withdraw endpoint
 * refuses to create a new withdrawal while any pending exists, so the
 * 10-minute window is the maximum a user ever waits — no double-spend.
 */
fun autoClearStuckWithdrawals() {
    val conn = DatabaseService.getConnection()
    try {
        val clearStmt = conn.prepareStatement("""
            UPDATE wallet_transactions 
            SET status = 'failed', updated_at = now()
            WHERE type = 'withdrawal' AND status = 'pending'
            AND created_at < now() - interval '10 minutes'
        """.trimIndent())
        val cleared = clearStmt.executeUpdate()
        if (cleared > 0) {
            println("[AUTO-CLEAR] Cleared $cleared stuck pending withdrawals")
        }
    } catch (e: Exception) {
        println("[AUTO-CLEAR] Error: ${e.message}")
    } finally {
        conn.close()
    }
}

fun reconcilePendingDeposits() = runBlocking {
    val conn = DatabaseService.getConnection()
    try {
        val pendingStmt = conn.prepareStatement(
            "SELECT id, reference, user_id, amount, fee FROM wallet_transactions " +
            "WHERE type = 'deposit' AND status = 'pending' AND created_at < now() - interval '2 minutes' " +
            "ORDER BY created_at ASC LIMIT 5"
        )
        val pendingRs = pendingStmt.executeQuery()
        var reconciled = 0
        while (pendingRs.next()) {
            val txRef = pendingRs.getString("reference")
            val txId = pendingRs.getString("id")
            val userId = pendingRs.getString("user_id")
            val totalAmount = pendingRs.getDouble("amount")
            val fee = pendingRs.getDouble("fee")
            val netAmount = totalAmount - fee
            var flwStatus: String? = null
            try {
                val httpClient = HttpClient(CIO)
                val verifyResp = httpClient.get("https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=$txRef") {
                    header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                }
                if (verifyResp.status.isSuccess()) {
                    val json = Json { ignoreUnknownKeys = true }
                    val verifyJson = json.parseToJsonElement(verifyResp.bodyAsText()).jsonObject
                    flwStatus = verifyJson["data"]?.jsonObject?.get("status")?.jsonPrimitive?.contentOrNull
                }
                httpClient.close()
            } catch (e: Exception) { println("[RECONCILE] Flutterwave check failed for $txRef: ${e.message}") }
            val newStatus = when {
                flwStatus?.equals("successful", ignoreCase = true) == true -> "completed"
                flwStatus?.equals("cancelled", ignoreCase = true) == true -> "failed"
                flwStatus?.equals("failed", ignoreCase = true) == true -> "failed"
                flwStatus == null -> "failed" // Flutterwave has no record - payment was cancelled/abandoned
                else -> null
            }
            if (newStatus != null) {
                if (newStatus == "completed") {
                    val balStmt = conn.prepareStatement(
                        "SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount " +
                        "WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount " +
                        "ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'"
                    )
                    balStmt.setString(1, userId)
                    val balRs = balStmt.executeQuery()
                    val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
                    val newBalance = currentBalance + netAmount
                    val updateStmt = conn.prepareStatement(
                        "UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now() WHERE id = ?::uuid"
                    )
                    updateStmt.setDouble(1, currentBalance)
                    updateStmt.setDouble(2, newBalance)
                    updateStmt.setString(3, txId)
                    updateStmt.executeUpdate()
                    println("[RECONCILE] Auto-credited ₦$netAmount to user $userId for tx_ref=$txRef")
                } else {
                    val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
                    updateStmt.setString(1, txId)
                    updateStmt.executeUpdate()
                    println("[RECONCILE] Auto-marked as failed: tx_ref=$txRef, flw_status=$flwStatus")
                }
                reconciled++
            }
        }
        if (reconciled > 0) println("[RECONCILE] Auto-reconciled $reconciled deposits")
    } catch (e: Exception) { println("[RECONCILE] Error: ${e.message}") } finally { conn.close() }
}

fun processPendingWithdrawals() = runBlocking {
    val conn = DatabaseService.getConnection()
    try {
        // Process only ONE withdrawal at a time to prevent double-spending.
        // IDEMPOTENCY: skip if this reference was already sent to Flutterwave
        // (transfer_id present) — just poll its status instead of re-sending,
        // so a retry never double-pays the user.
        val pendingStmt = conn.prepareStatement(
            "SELECT id, user_id, amount, reference, metadata, transfer_id FROM wallet_transactions " +
            "WHERE type = 'withdrawal' AND status = 'pending' ORDER BY created_at ASC LIMIT 1"
        )
        val pendingRs = pendingStmt.executeQuery()
        if (!pendingRs.next()) return@runBlocking
        
        val txId = pendingRs.getString("id")
        val userId = pendingRs.getString("user_id")
        val amount = pendingRs.getDouble("amount")
        val reference = pendingRs.getString("reference")
        
        // Destination details live ON the transaction (each user has different
        // bank details) — never pull them from another user's profile row.
        val rawMeta = try { pendingRs.getString("metadata") } catch (e: Exception) { null }
        var accountNumber: String? = null
        var bankCode: String? = null
        try {
            if (!rawMeta.isNullOrBlank()) {
                val meta = Json { ignoreUnknownKeys = true }.parseToJsonElement(rawMeta).jsonObject
                accountNumber = meta["accountNumber"]?.jsonPrimitive?.contentOrNull
                bankCode = meta["bankCode"]?.jsonPrimitive?.contentOrNull
            }
        } catch (e: Exception) { println("[PAYOUT] Metadata parse failed for $reference: ${e.message}") }
        if (accountNumber.isNullOrBlank() || bankCode.isNullOrBlank()) {
            // Legacy rows without metadata: fall back to the OWNER's saved account.
            try {
                val bankStmt = conn.prepareStatement("SELECT bank_account_number, bank_code FROM profiles WHERE id = ?::uuid LIMIT 1")
                bankStmt.setString(1, userId)
                val bankRs = bankStmt.executeQuery()
                if (bankRs.next()) {
                    if (accountNumber.isNullOrBlank()) accountNumber = bankRs.getString("bank_account_number")
                    if (bankCode.isNullOrBlank()) bankCode = bankRs.getString("bank_code")
                }
            } catch (e: Exception) { println("[PAYOUT] Profile fallback failed for $reference: ${e.message}") }
        }
        if (accountNumber.isNullOrBlank() || bankCode.isNullOrBlank()) { markWithdrawalFailed(conn, txId, "No bank details on transaction"); return@runBlocking }
        
        // Calculate available balance (completed balance minus all pending withdrawals)
        val balStmt = conn.prepareStatement(
            "SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount - fee " +
            "WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount " +
            "ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'"
        )
        balStmt.setString(1, userId)
        val balRs = balStmt.executeQuery()
        val completedBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
        
        // Get total pending withdrawal amount for this user
        val pendingBalStmt = conn.prepareStatement(
            "SELECT COALESCE(SUM(amount), 0.00) AS pending FROM wallet_transactions " +
            "WHERE user_id = ?::uuid AND type = 'withdrawal' AND status = 'pending' AND id != ?::uuid"
        )
        pendingBalStmt.setString(1, userId)
        pendingBalStmt.setString(2, txId)
        val pendingBalRs = pendingBalStmt.executeQuery()
        val otherPendingAmount = if (pendingBalRs.next()) pendingBalRs.getDouble("pending") else 0.0
        
        val availableBalance = completedBalance - otherPendingAmount
        
        if (availableBalance < amount) { 
            markWithdrawalFailed(conn, txId, "Insufficient balance (available: ₦${availableBalance.toInt()})")
            return@runBlocking 
        }
        
        // Process transfer via Flutterwave
        var transferSuccess = false
        var failDetail: String? = null
        var transferId: String? = try { pendingRs.getString("transfer_id") } catch (e: Exception) { null }
        // If we already sent this reference to Flutterwave, POLL the transfer
        // status instead of creating a second transfer (prevents double-pay).
        if (!transferId.isNullOrBlank()) {
            try {
                val httpClient = HttpClient(CIO)
                val pollResp = httpClient.get("https://api.flutterwave.com/v3/transfers/$transferId") {
                    header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                }
                val pollText = pollResp.bodyAsText()
                if (pollResp.status.isSuccess()) {
                    val pollJson = Json { ignoreUnknownKeys = true }.parseToJsonElement(pollText).jsonObject
                    val fwStatus = pollJson["data"]?.jsonObject?.get("status")?.jsonPrimitive?.contentOrNull
                    println("[PAYOUT] Poll $reference transferId=$transferId fwStatus=$fwStatus")
                    when (fwStatus?.uppercase()) {
                        "SUCCESSFUL" -> transferSuccess = true
                        "FAILED", "REJECTED", "CANCELLED" -> { transferSuccess = false; failDetail = "Provider reports $fwStatus" }
                        else -> { println("[PAYOUT] $reference still in progress at provider ($fwStatus); leaving pending"); httpClient.close(); return@runBlocking }
                    }
                } else {
                    failDetail = "Poll HTTP ${pollResp.status.value}: ${pollText.take(200)}"
                }
                httpClient.close()
            } catch (e: Exception) { failDetail = e.message; println("[PAYOUT] Poll error for $reference: ${e.message}") }
        } else {
        try {
            val httpClient = HttpClient(CIO)
            // Background payout also needs the Flutterwave code, not the NIP code.
            val fwCode = mapOf("000033" to "999992", "000034" to "999995", "000031" to "999991")[bankCode] ?: bankCode
            val transferPayload = buildJsonObject {
                put("account_bank", JsonPrimitive(fwCode))
                put("account_number", JsonPrimitive(accountNumber))
                put("amount", JsonPrimitive(amount.toInt()))
                put("currency", JsonPrimitive("NGN"))
                put("reference", JsonPrimitive(reference))
                put("narration", JsonPrimitive("DOU Transit Wallet Withdrawal"))
            }
            val transferResp = httpClient.post("https://api.flutterwave.com/v3/transfers") {
                header(HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                contentType(ContentType.Application.Json)
                setBody(transferPayload.toString())
            }
            if (transferResp.status.isSuccess()) {
                val json = Json { ignoreUnknownKeys = true }
                val responseBody = json.parseToJsonElement(transferResp.bodyAsText()).jsonObject
                if (responseBody["status"]?.jsonPrimitive?.contentOrNull == "success") transferSuccess = true
            }
            httpClient.close()
        } catch (e: Exception) { failDetail = e.message; println("[PAYOUT] Flutterwave transfer error: ${e.message}") }
        } // end else (fresh transfer attempt)

        if (transferSuccess) {
            val newBalance = availableBalance - amount
            val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, transfer_id = ?, updated_at = now() WHERE id = ?::uuid")
            updateStmt.setDouble(1, availableBalance)
            updateStmt.setDouble(2, newBalance)
            updateStmt.setString(3, transferId)
            updateStmt.setString(4, txId)
            updateStmt.executeUpdate()
            println("[PAYOUT] Withdrawal completed for user $userId: ₦$amount (transferId=$transferId)")
        } else {
            markWithdrawalFailed(conn, txId, "Transfer failed: ${failDetail ?: "unknown"}")
        }
    } catch (e: Exception) { println("[PAYOUT] Error: ${e.message}") } finally { conn.close() }
}

private fun markWithdrawalFailed(conn: java.sql.Connection, txId: String, reason: String) {
    val failStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
    failStmt.setString(1, txId)
    failStmt.executeUpdate()
    println("[PAYOUT] Marked withdrawal $txId as failed: $reason")
}