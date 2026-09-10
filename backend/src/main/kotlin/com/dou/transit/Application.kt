package com.dou.transit

import com.dou.transit.config.AppConfig
import com.dou.transit.models.*
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
    // Content Negotiation with JSON
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
            prettyPrint = false
        })
    }

    // CORS Headers
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

    // Status Pages for clean Error Responses
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            println("[SERVER ERROR] ${call.request.httpMethod.value} ${call.request.uri}: ${cause.message}")
            cause.printStackTrace()
            call.respond(
                status = HttpStatusCode.InternalServerError,
                message = ErrorResponse(
                    error = cause.message ?: "Internal server error",
                    details = cause.javaClass.simpleName
                )
            )
        }
    }

    // Initialize Firebase Admin SDK for push notifications
    try {
        NotificationService.initialize()
    } catch (e: Exception) {
        println("[SERVER] Firebase init warning: ${e.message}")
    }

    // Application Routes
    routing {
        suspend fun handleHealth(call: ApplicationCall) {
            val dbOk = DatabaseService.isHealthy()
            call.respond(HealthResponse(
                status = "ok",
                version = "1.0.2",
                service = "DOU Transit Production API",
                database = if (dbOk) "connected" else "connecting",
                timestamp = System.currentTimeMillis()
            ))
        }

        // Root & Health check endpoints
        get("/") { handleHealth(call) }
        get("/health") { handleHealth(call) }
        get("/api/health") { handleHealth(call) }

        // Route modules
        authRoutes()
        walletRoutes()
        rideRoutes()
        queueRoutes()
        emergencyRoutes()
        lostItemRoutes()
        reportRoutes()
        adminRoutes()
        marketplaceRoutes()
        developerRoutes()
        driverLocationRoutes()
        securityRoutes()
        notificationRoutes()
        offlineRoutes()
        paymentRequestRoutes()
    }

    println("""
    ╔══════════════════════════════════════════════════════╗
    ║             DOU Transit API Server v1.0.2           ║
    ║             Port: ${AppConfig.port}                              ║
    ║             Database: ${AppConfig.supabaseDbUrl.substringBefore("?")} ║
    ╚══════════════════════════════════════════════════════╝
    """.trimIndent())
}
