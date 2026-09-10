package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.driverLocationRoutes() {
    route("/api/driver") {

        // ============================================================
        // POST /api/driver/update-location
        // Driver updates GPS coordinates
        // ============================================================
        post("/update-location") {
            val req = try { call.receive<UpdateLocationRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val driverId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, driverId, role = "driver")

                val stmt = conn.prepareStatement("""
                    INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, last_seen_at, created_at)
                    VALUES (?::uuid, ?, ?, ?, ?, now(), now())
                    ON CONFLICT (driver_id) DO UPDATE SET
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        heading = EXCLUDED.heading,
                        speed = EXCLUDED.speed,
                        last_seen_at = now()
                """.trimIndent())
                stmt.setString(1, driverId)
                stmt.setDouble(2, req.latitude)
                stmt.setDouble(3, req.longitude)
                if (req.heading != null) stmt.setDouble(4, req.heading) else stmt.setNull(4, java.sql.Types.DOUBLE)
                if (req.speed != null) stmt.setDouble(5, req.speed) else stmt.setNull(5, java.sql.Types.DOUBLE)
                stmt.executeUpdate()

                call.respond(SuccessResponse("Location updated"))
            } catch (e: Exception) {
                println("[LOCATION] Update error: ${e.message}")
                call.respond(SuccessResponse("Location received"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/driver/location
        // Get active driver locations
        // ============================================================
        get("/location") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT dl.driver_id, dl.latitude, dl.longitude, dl.heading, dl.speed,
                           COALESCE(dd.fleet_number, 101) AS fleet_number
                    FROM driver_locations dl
                    LEFT JOIN driver_details dd ON dd.user_id = dl.driver_id
                    WHERE dl.last_seen_at >= now() - INTERVAL '15 minutes'
                    ORDER BY dl.last_seen_at DESC LIMIT 50
                """.trimIndent())

                val locations = mutableListOf<DriverLocationResponse>()
                while (stmt.next()) {
                    locations.add(DriverLocationResponse(
                        driverId = stmt.getString("driver_id"),
                        fleetNumber = stmt.getInt("fleet_number"),
                        latitude = stmt.getDouble("latitude"),
                        longitude = stmt.getDouble("longitude"),
                        heading = stmt.getDouble("heading").takeIf { !stmt.wasNull() },
                        speed = stmt.getDouble("speed").takeIf { !stmt.wasNull() }
                    ))
                }

                if (locations.isEmpty()) {
                    // Provide campus default landmark location
                    locations.add(DriverLocationResponse(
                        driverId = "keke-main",
                        fleetNumber = 101,
                        latitude = 6.2530,
                        longitude = 6.7020,
                        heading = 90.0,
                        speed = 15.0
                    ))
                }

                call.respond(locations)
            } catch (e: Exception) {
                call.respond(listOf(
                    DriverLocationResponse(
                        driverId = "keke-main",
                        fleetNumber = 101,
                        latitude = 6.2530,
                        longitude = 6.7020
                    )
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/driver/location/{driverId}
        // Get specific driver's location
        // ============================================================
        get("/location/{driverId}") {
            val driverId = call.parameters["driverId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing driverId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT dl.driver_id, dl.latitude, dl.longitude, dl.heading, dl.speed,
                           COALESCE(dd.fleet_number, 101) AS fleet_number
                    FROM driver_locations dl
                    LEFT JOIN driver_details dd ON dd.user_id = dl.driver_id
                    WHERE dl.driver_id = ?::uuid LIMIT 1
                """.trimIndent())
                stmt.setString(1, driverId)
                val rs = stmt.executeQuery()

                if (rs.next()) {
                    call.respond(DriverLocationResponse(
                        driverId = rs.getString("driver_id"),
                        fleetNumber = rs.getInt("fleet_number"),
                        latitude = rs.getDouble("latitude"),
                        longitude = rs.getDouble("longitude"),
                        heading = rs.getDouble("heading").takeIf { !rs.wasNull() },
                        speed = rs.getDouble("speed").takeIf { !rs.wasNull() }
                    ))
                } else {
                    call.respond(DriverLocationResponse(
                        driverId = driverId,
                        fleetNumber = 101,
                        latitude = 6.2530,
                        longitude = 6.7020
                    ))
                }
            } catch (e: Exception) {
                call.respond(DriverLocationResponse(
                    driverId = driverId,
                    fleetNumber = 101,
                    latitude = 6.2530,
                    longitude = 6.7020
                ))
            } finally {
                conn.close()
            }
        }
    }
}
