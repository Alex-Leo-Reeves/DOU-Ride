package com.dou.transit.services

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Resolves and caches the server's outgoing (egress) IP address.
 *
 * Flutterwave's v3 Transfers API rejects requests with HTTP 400
 * "Please enable IP Whitelisting to access this service" unless the
 * calling server's IP is whitelisted on the Flutterwave dashboard.
 * Render shared tiers assign dynamic egress IPs that CAN change over
 * time, so we periodically re-resolve and cache the IP:
 *
 *   - Cached value is surfaced in withdrawal error messages so the
 *     user always sees the CURRENT IP to whitelist (no stale info).
 *   - A background refresh job re-resolves every 30 minutes. If the
 *     IP changes, a loud warning is logged so the operator knows to
 *     update Flutterwave before the next withdrawal fails.
 */
object EgressIpManager {

    private val cachedIp = AtomicReference<String?>(null)
    private val client = HttpClient(CIO)

    /** Number of consecutive resolve failures logged before we stop spamming. */
    private var failures = 0

    init {
        // Resolve immediately on first class-load so the value is available
        // for the very first withdrawal after a cold start.
        runBlocking { refresh() }
        // Then schedule periodic refresh.
        val scheduler = Executors.newSingleThreadScheduledExecutor()
        scheduler.scheduleAtFixedRate({
            try {
                runBlocking { refresh() }
            } catch (e: Exception) {
                failures++
                if (failures <= 3) {
                    println("[EGRESS-IP] Periodic refresh failed: ${e.message}")
                }
            }
        }, 30, 30, TimeUnit.MINUTES)
    }

    /** Returns the currently-cached egress IP, or null if never resolved. */
    fun currentIp(): String? = cachedIp.get()

    /**
     * Returns the cached IP if present, otherwise forces a fresh resolve
     * and returns that. Use this in hot paths (withdrawal errors) so the
     * user never sees a stale/blank IP even if the background job lags.
     */
    fun currentIpOrResolve(): String? {
        val cached = cachedIp.get()
        if (cached != null) return cached
        return try {
            runBlocking { resolve() }
        } catch (e: Exception) {
            null
        }
    }

    /** Forces a fresh resolve, updates the cache, logs on change. */
    private suspend fun refresh() {
        val previous = cachedIp.get()
        val fresh = resolve()
        cachedIp.set(fresh)
        if (previous != null && fresh != null && previous != fresh) {
            println("[EGRESS-IP] WARNING: egress IP changed from $previous to $fresh — update Flutterwave whitelist immediately!")
        } else if (previous == null && fresh != null) {
            println("[EGRESS-IP] Resolved initial egress IP: $fresh")
        }
        if (fresh != null) failures = 0
    }

    private suspend fun resolve(): String? {
        val ip = client.get("https://api.ipify.org").bodyAsText().trim()
        return ip.ifBlank { null }
    }
}
