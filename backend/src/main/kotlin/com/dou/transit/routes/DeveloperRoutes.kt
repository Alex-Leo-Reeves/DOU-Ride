package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.developerRoutes() {
    route("/api/landmarks") {

        // ============================================================
        // POST /api/landmarks/add
        // Add a new campus landmark (GPS coordinate recording)
        // Requires X-User-Id header.
        // ============================================================
        post("/add") {
            val req = try { call.receive<AddLandmarkRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val userId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    INSERT INTO campus_landmarks (display_name, latitude, longitude, landmark_type, created_by)
                    VALUES (?, ?, ?, ?::text, ?::uuid)
                    RETURNING id
                """.trimIndent())
                stmt.setString(1, req.displayName)
                stmt.setDouble(2, req.latitude)
                stmt.setDouble(3, req.longitude)
                stmt.setString(4, req.landmarkType)
                stmt.setString(5, userId)
                val rs = stmt.executeQuery()
                val id = if (rs.next()) rs.getString("id") else ""

                call.respond(HttpStatusCode.Created, mapOf(
                    "message" to "Landmark added: ${req.displayName}",
                    "id" to id
                ))
            } catch (e: Exception) {
                println("[LANDMARKS] Add error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to add landmark"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // PUT /api/landmarks/update/{id}
        // Update an existing landmark
        // ============================================================
        put("/update/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))
            val req = try { call.receive<AddLandmarkRequest>() }
            catch (e: Exception) { return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    UPDATE campus_landmarks
                    SET display_name = ?, latitude = ?, longitude = ?, landmark_type = ?::text, updated_at = now()
                    WHERE id = ?::uuid AND is_active = true
                """.trimIndent())
                stmt.setString(1, req.displayName)
                stmt.setDouble(2, req.latitude)
                stmt.setDouble(3, req.longitude)
                stmt.setString(4, req.landmarkType)
                stmt.setString(5, id)
                val updated = stmt.executeUpdate()

                if (updated == 0) return@put call.respond(HttpStatusCode.NotFound, ErrorResponse("Landmark not found"))
                call.respond(SuccessResponse("Landmark updated"))
            } catch (e: Exception) {
                println("[LANDMARKS] Update error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update landmark"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // DELETE /api/landmarks/delete/{id}
        // Soft delete (set is_active = false)
        // ============================================================
        delete("/delete/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    UPDATE campus_landmarks SET is_active = false, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent())
                stmt.setString(1, id)
                val updated = stmt.executeUpdate()

                if (updated == 0) return@delete call.respond(HttpStatusCode.NotFound, ErrorResponse("Landmark not found"))
                call.respond(SuccessResponse("Landmark removed"))
            } catch (e: Exception) {
                println("[LANDMARKS] Delete error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to delete landmark"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/landmarks
        // List all active landmarks (optionally filtered by type)
        // Public — no auth required.
        // ============================================================
        get("") {
            val landmarkType = call.request.queryParameters["type"]

            val conn = DatabaseService.getConnection()
            try {
                val query = if (landmarkType != null) {
                    conn.prepareStatement("""
                        SELECT id, display_name, latitude, longitude, landmark_type, is_active
                        FROM campus_landmarks
                        WHERE is_active = true AND landmark_type = ?::text
                        ORDER BY display_name ASC
                    """.trimIndent()).apply {
                        setString(1, landmarkType!!)
                    }
                } else {
                    conn.prepareStatement("""
                        SELECT id, display_name, latitude, longitude, landmark_type, is_active
                        FROM campus_landmarks
                        WHERE is_active = true
                        ORDER BY display_name ASC
                    """.trimIndent())
                }

                val rs = query.executeQuery()
                val landmarks = mutableListOf<LandmarkResponse>()

                while (rs.next()) {
                    landmarks.add(LandmarkResponse(
                        id = rs.getString("id"),
                        displayName = rs.getString("display_name"),
                        latitude = rs.getDouble("latitude"),
                        longitude = rs.getDouble("longitude"),
                        landmarkType = rs.getString("landmark_type"),
                        isActive = rs.getBoolean("is_active")
                    ))
                }

                call.respond(landmarks)
            } catch (e: Exception) {
                println("[LANDMARKS] List error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch landmarks"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/landmarks/{id}
        // Get a single landmark by ID
        // ============================================================
        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, display_name, latitude, longitude, landmark_type, is_active
                    FROM campus_landmarks
                    WHERE id = ?::uuid AND is_active = true
                    LIMIT 1
                """.trimIndent())
                stmt.setString(1, id)
                val rs = stmt.executeQuery()

                if (!rs.next()) return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Landmark not found"))

                call.respond(LandmarkResponse(
                    id = rs.getString("id"),
                    displayName = rs.getString("display_name"),
                    latitude = rs.getDouble("latitude"),
                    longitude = rs.getDouble("longitude"),
                    landmarkType = rs.getString("landmark_type"),
                    isActive = rs.getBoolean("is_active")
                ))
            } catch (e: Exception) {
                println("[LANDMARKS] Get error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch landmark"))
            } finally {
                conn.close()
            }
        }
    }
}
