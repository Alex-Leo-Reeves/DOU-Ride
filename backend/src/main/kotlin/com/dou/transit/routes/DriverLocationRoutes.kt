package com.dou.transit.routes

import com.dou.transit.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.driverLocationRoutes() {
    route("/api/driver/location") {
        // Driver updates their current GPS location (called frequently while active)
        post("") {
            val req = call.receive<UpdateLocationRequest>()
            // TODO: Upsert into driver_locations table (realtime-enabled)
            // TODO: Update heading, speed, last_seen_at
            call.respond(SuccessResponse("Location updated"))
        }

        // Get all currently active driver locations
        get("") {
            // TODO: Query driver_locations WHERE last_seen_at > NOW() - INTERVAL '30 seconds'
            call.respond(listOf<DriverLocationResponse>())
        }

        // Get a specific driver's latest location
        get("/{driverId}") {
            val driverId = call.parameters["driverId"] ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing driverId"))
            // TODO: Fetch latest location for driver
            call.respond(DriverLocationResponse(
                driverId = driverId,
                fleetNumber = 42,
                latitude = 6.2500,
                longitude = 6.7000,
                heading = 180.0,
                speed = 25.0
            ))
        }
    }
}
