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
        // ============================================================
        post("/add") {
            val req = try { call.receive<AddLandmarkRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val userId = call.request.headers["X-User-Id"]

            val conn = DatabaseService.getConnection()
            try {
                if (userId != null) {
                    DatabaseService.ensureProfileExists(conn, userId, role = "developer")
                }

                val id = UUID.randomUUID().toString()
                val stmt = conn.prepareStatement("""
                    INSERT INTO campus_landmarks (id, display_name, latitude, longitude, landmark_type, is_active, created_at, updated_at)
                    VALUES (?::uuid, ?, ?, ?, ?::text, true, now(), now())
                """.trimIndent())
                stmt.setString(1, id)
                stmt.setString(2, req.displayName)
                stmt.setDouble(3, req.latitude)
                stmt.setDouble(4, req.longitude)
                stmt.setString(5, req.landmarkType)
                stmt.executeUpdate()

                call.respond(HttpStatusCode.Created, AddLandmarkResponse(
                    message = "Landmark added: ${req.displayName}",
                    id = id
                ))
            } catch (e: Exception) {
                println("[LANDMARKS] Add error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to add landmark", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // PUT /api/landmarks/update/{id}
        // ============================================================
        put("/update/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))
            val req = try { call.receive<AddLandmarkRequest>() }
            catch (e: Exception) { return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("""
                    UPDATE campus_landmarks
                    SET display_name = ?, latitude = ?, longitude = ?, landmark_type = ?::text, updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply {
                    setString(1, req.displayName)
                    setDouble(2, req.latitude)
                    setDouble(3, req.longitude)
                    setString(4, req.landmarkType)
                    setString(5, id)
                    executeUpdate()
                }

                call.respond(SuccessResponse("Landmark updated successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update landmark", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // DELETE /api/landmarks/delete/{id}
        // ============================================================
        delete("/delete/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE campus_landmarks SET is_active = false, updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, id); executeUpdate() }

                call.respond(SuccessResponse("Landmark deleted"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to delete landmark", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/landmarks
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
                    """.trimIndent()).apply { setString(1, landmarkType) }
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

                if (landmarks.isEmpty()) {
                    landmarks.addAll(listOf(
                        LandmarkResponse(id = "lm-1", displayName = "Main Gate (Campus Entrance)", latitude = 6.2505, longitude = 6.6980, landmarkType = "gate", isActive = true),
                        LandmarkResponse(id = "lm-2", displayName = "Senate Building / Admin Block", latitude = 6.2520, longitude = 6.7010, landmarkType = "destination", isActive = true),
                        LandmarkResponse(id = "lm-3", displayName = "Faculty of Science & Tech", latitude = 6.2545, longitude = 6.7040, landmarkType = "destination", isActive = true),
                        LandmarkResponse(id = "lm-4", displayName = "University Library & E-Hub", latitude = 6.2530, longitude = 6.7025, landmarkType = "destination", isActive = true),
                        LandmarkResponse(id = "lm-5", displayName = "Hostel Village A & B", latitude = 6.2570, longitude = 6.7080, landmarkType = "destination", isActive = true),
                        LandmarkResponse(id = "lm-6", displayName = "Campus Health & Medical Centre", latitude = 6.2515, longitude = 6.7000, landmarkType = "medical_center", isActive = true)
                    ))
                }

                call.respond(landmarks)
            } catch (e: Exception) {
                call.respond(listOf(
                    LandmarkResponse(id = "lm-1", displayName = "Main Gate", latitude = 6.2505, longitude = 6.6980, landmarkType = "gate", isActive = true),
                    LandmarkResponse(id = "lm-2", displayName = "Senate Building", latitude = 6.2520, longitude = 6.7010, landmarkType = "destination", isActive = true)
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/landmarks/{id}
        // ============================================================
        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("SELECT id, display_name, latitude, longitude, landmark_type, is_active FROM campus_landmarks WHERE id = ?::uuid LIMIT 1")
                stmt.setString(1, id)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Landmark not found"))
                }

                call.respond(LandmarkResponse(
                    id = rs.getString("id"),
                    displayName = rs.getString("display_name"),
                    latitude = rs.getDouble("latitude"),
                    longitude = rs.getDouble("longitude"),
                    landmarkType = rs.getString("landmark_type"),
                    isActive = rs.getBoolean("is_active")
                ))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch landmark", e.message))
            } finally {
                conn.close()
            }
        }
    }
}
