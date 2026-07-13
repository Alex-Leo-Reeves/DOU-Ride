package com.dou.transit.routes

import com.dou.transit.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.developerRoutes() {
    route("/api/landmarks") {
        // Add a new campus landmark (GPS coordinate recording)
        post("/add") {
            val req = call.receive<AddLandmarkRequest>()
            // TODO: Insert into campus_landmarks table
            call.respond(HttpStatusCode.Created, SuccessResponse("Landmark added: ${req.displayName}"))
        }

        // Update an existing landmark
        put("/update/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))
            val req = call.receive<AddLandmarkRequest>()
            // TODO: Update campus_landmarks SET display_name, latitude, longitude, landmark_type
            call.respond(SuccessResponse("Landmark updated"))
        }

        // Delete a landmark
        delete("/delete/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))
            // TODO: Soft delete or set is_active = false
            call.respond(SuccessResponse("Landmark removed"))
        }

        // List all landmarks (optionally filtered by type)
        get("") {
            val landmarkType = call.request.queryParameters["type"]
            // TODO: Fetch all active landmarks, optionally filter by type
            call.respond(listOf<LandmarkResponse>())
        }

        // Get a single landmark by ID
        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing id"))
            // TODO: Fetch single landmark
            call.respond(LandmarkResponse(
                id = id,
                displayName = "Faculty of Science",
                latitude = 6.2500,
                longitude = 6.7000,
                landmarkType = "destination",
                isActive = true
            ))
        }
    }
}
