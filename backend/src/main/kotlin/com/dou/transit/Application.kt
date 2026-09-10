package com.dou.transit

import com.dou.transit.config.AppConfig
import com.dou.transit.routes.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json

fun main() {
    embeddedServer(Netty, port = AppConfig.port, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module() {
    // JSON Serialization
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            isLenient = true
        })
    }

    // CORS - Manual intercept guarantees headers on every response including OPTIONS preflight
    intercept(ApplicationCallPipeline.Plugins) {
        val origin = call.request.headers["Origin"] ?: "*"
        call.response.header(HttpHeaders.AccessControlAllowOrigin, origin)
        call.response.header(HttpHeaders.AccessControlAllowMethods, "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        call.response.header(HttpHeaders.AccessControlAllowHeaders, "Content-Type, Authorization, X-User-Id, X-FLW-SIGNATURE, X-Requested-With, verif-hash")
        call.response.header(HttpHeaders.AccessControlMaxAge, "86400")
        call.response.header(HttpHeaders.AccessControlAllowCredentials, "true")

        // Auto-respond OK to all preflight OPTIONS requests
        if (call.request.httpMethod == HttpMethod.Options) {
            call.respond(HttpStatusCode.OK)
            finish()
            return@intercept
        }
    }

    // Error handling
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respondText(
                contentType = ContentType.Application.Json,
                status = HttpStatusCode.InternalServerError,
                text = """{"error":"${cause.message?.replace("\"", "'") ?: "Unknown error"}","details":"Internal server error"}"""
            )
        }
    }

    // Initialize Firebase Admin SDK for push notifications
    NotificationService.initialize()

    // ============================================================
    // ALL API ROUTES
    // ============================================================
    routing {
        // Health check with DB status
        get("/api/health") {
            var dbOk = false
            try {
                DatabaseService.getConnection().use { conn ->
                    dbOk = !conn.isClosed
                }
            } catch (_: Exception) {}
            call.respond(mapOf(
                "status" to "ok",
                "version" to "1.0.0",
                "service" to "DOU Transit Production API",
                "database" to if (dbOk) "connected" else "connecting",
                "timestamp" to System.currentTimeMillis()
            ))
        }

        // Auth routes
        authRoutes()

        // Wallet & payment routes
        walletRoutes()

        // Ride routes
        rideRoutes()

        // Queue routes
        queueRoutes()

        // Emergency routes
        emergencyRoutes()

        // Lost & Found routes
        lostItemRoutes()

        // Report routes
        reportRoutes()

        // Admin routes
        adminRoutes()

        // Marketplace routes
        marketplaceRoutes()

        // Developer mapping routes
        developerRoutes()

        // Driver location routes
        driverLocationRoutes()

        // Security gate routes
        securityRoutes()

        // Notification dispatch
        notificationRoutes()

        // Offline resilience
        offlineRoutes()

        // Payment request routes
        paymentRequestRoutes()
    }

    println("""
    ╔══════════════════════════════════════════╗
    ║     DOU Transit API Server v1.0.0       ║
    ║     Running on port ${AppConfig.port}           ║
    ║     OSRM: ${AppConfig.osrmUrl}   ║
    ╚══════════════════════════════════════════╝
    """.trimIndent())
}
