package com.dou.transit

import com.dou.transit.config.AppConfig
import com.dou.transit.services.DatabaseService
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json

fun reconcilePendingDeposits() {
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

fun processPendingWithdrawals() {
    val conn = DatabaseService.getConnection()
    try {
        val pendingStmt = conn.prepareStatement(
            "SELECT id, user_id, amount, reference FROM wallet_transactions " +
            "WHERE type = 'withdrawal' AND status = 'pending' ORDER BY created_at ASC LIMIT 5"
        )
        val pendingRs = pendingStmt.executeQuery()
        var processed = 0
        while (pendingRs.next()) {
            val txId = pendingRs.getString("id")
            val userId = pendingRs.getString("user_id")
            val amount = pendingRs.getDouble("amount")
            val reference = pendingRs.getString("reference")
            val bankStmt = conn.prepareStatement("SELECT bank_account_number, bank_code FROM driver_details WHERE user_id = ?::uuid LIMIT 1")
            bankStmt.setString(1, userId)
            val bankRs = bankStmt.executeQuery()
            if (!bankRs.next()) { markWithdrawalFailed(conn, txId, "No bank details"); continue }
            val accountNumber = bankRs.getString("bank_account_number")
            val bankCode = bankRs.getString("bank_code")
            if (accountNumber.isNullOrBlank() || bankCode.isNullOrBlank()) { markWithdrawalFailed(conn, txId, "Incomplete bank details"); continue }
            val balStmt = conn.prepareStatement(
                "SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount " +
                "WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount " +
                "ELSE 0 END), 0.00) AS balance FROM wallet_transactions WHERE user_id = ?::uuid AND status = 'completed'"
            )
            balStmt.setString(1, userId)
            val balRs = balStmt.executeQuery()
            val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0
            if (currentBalance < amount) { markWithdrawalFailed(conn, txId, "Insufficient balance"); continue }
            var transferSuccess = false
            try {
                val httpClient = io.ktor.client.HttpClient(io.ktor.client.engine.cio.CIO)
                val transferPayload = kotlinx.serialization.json.buildJsonObject {
                    put("account_bank", bankCode)
                    put("account_number", accountNumber)
                    put("amount", amount.toInt())
                    put("currency", "NGN")
                    put("reference", reference)
                    put("narration", "DOU Transit Wallet Withdrawal")
                }
                val transferResp = httpClient.post("https://api.flutterwave.com/v3/transfers") {
                    header(io.ktor.http.HttpHeaders.Authorization, "Bearer ${AppConfig.flutterwaveSecretKey}")
                    contentType(io.ktor.http.ContentType.Application.Json)
                    setBody(transferPayload.toString())
                }
                if (transferResp.status.isSuccess()) {
                    val json = Json { ignoreUnknownKeys = true }
                    val responseBody = json.parseToJsonElement(transferResp.bodyAsText()).jsonObject
                    if (responseBody["status"]?.jsonPrimitive?.contentOrNull == "success") transferSuccess = true
                }
                httpClient.close()
            } catch (e: Exception) { println("[PAYOUT] Flutterwave transfer error: ${e.message}") }
            if (transferSuccess) {
                val newBalance = currentBalance - amount
                val updateStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'completed', balance_before = ?, balance_after = ?, updated_at = now() WHERE id = ?::uuid")
                updateStmt.setDouble(1, currentBalance)
                updateStmt.setDouble(2, newBalance)
                updateStmt.setString(3, txId)
                updateStmt.executeUpdate()
                println("[PAYOUT] Withdrawal completed for user $userId: ₦$amount")
            } else {
                markWithdrawalFailed(conn, txId, "Transfer failed")
            }
            processed++
        }
        if (processed > 0) println("[PAYOUT] Auto-processed $processed withdrawals")
    } catch (e: Exception) { println("[PAYOUT] Error: ${e.message}") } finally { conn.close() }
}

private fun markWithdrawalFailed(conn: java.sql.Connection, txId: String, reason: String) {
    val failStmt = conn.prepareStatement("UPDATE wallet_transactions SET status = 'failed', updated_at = now() WHERE id = ?::uuid")
    failStmt.setString(1, txId)
    failStmt.executeUpdate()
    println("[PAYOUT] Marked withdrawal $txId as failed: $reason")
}