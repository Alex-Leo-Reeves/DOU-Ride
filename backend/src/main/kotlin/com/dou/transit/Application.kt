package com.dou.transit

import com.dou.transit.config.AppConfig
import com.dou.transit.routes.*
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
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

    // CORS - Allow Flutter app to connect
    install(CORS) {
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowHeader(HttpHeaders.AccessControlAllowOrigin)
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
        // Health check
        get("/api/health") {
            call.respond(mapOf("status" to "ok", "version" to "1.0.0"))
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
    }

    println("""
    ╔══════════════════════════════════════════╗
    ║     DOU Transit API Server v1.0.0       ║
    ║     Running on port ${AppConfig.port}           ║
    ║     OSRM: ${AppConfig.osrmUrl}   ║
    ╚══════════════════════════════════════════╝
    """.trimIndent())
}
