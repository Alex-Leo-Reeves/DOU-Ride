package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.JsonObject
import java.util.*
import kotlin.random.Random

fun Route.marketplaceRoutes() {
    route("/api/marketplace") {

        // ============================================================
        // POST /api/marketplace/order
        // Student places order: validate student, calculate total,
        // deduct wallet, create delivery_order with 3-digit PIN
        // ============================================================
        post("/order") {
            val req = try { call.receive<PlaceOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val studentId = call.request.headers["X-User-Id"]
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            if (req.items.isEmpty()) {
                return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Order must contain at least one item"))
            }

            val conn = DatabaseService.getConnection()
            try {
                val studentStmt = conn.prepareStatement("""
                    SELECT id, is_suspended FROM profiles WHERE id = ?::uuid AND role = 'student'
                """.trimIndent())
                studentStmt.setString(1, studentId)
                val studentRs = studentStmt.executeQuery()
                if (!studentRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Student profile not found"))
                }
                if (studentRs.getBoolean("is_suspended")) {
                    return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Student account is suspended"))
                }

                val vendorStmt = conn.prepareStatement("""
                    SELECT id FROM profiles WHERE id = ?::uuid AND role = 'vendor'
                """.trimIndent())
                vendorStmt.setString(1, req.vendorId)
                val vendorRs = vendorStmt.executeQuery()
                if (!vendorRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Vendor not found"))
                }

                var totalAmount = 0.0
                val resolvedItems = mutableListOf<Map<String, Any>>()

                for (item in req.items) {
                    val prodStmt = conn.prepareStatement("""
                        SELECT name, price, is_available FROM vendor_products
                        WHERE id = ?::uuid AND vendor_id = ?::uuid
                    """.trimIndent())
                    prodStmt.setString(1, item.productId)
                    prodStmt.setString(2, req.vendorId)
                    val prodRs = prodStmt.executeQuery()

                    if (!prodRs.next()) {
                        return@post call.respond(HttpStatusCode.NotFound,
                            ErrorResponse("Product ${item.productId} not found for this vendor"))
                    }
                    if (!prodRs.getBoolean("is_available")) {
                        return@post call.respond(HttpStatusCode.Conflict,
                            ErrorResponse("Product '${prodRs.getString("name")}' is currently unavailable"))
                    }

                    val price = prodRs.getDouble("price")
                    totalAmount += price * item.quantity
                    resolvedItems.add(mapOf(
                        "productId" to item.productId,
                        "name" to prodRs.getString("name"),
                        "quantity" to item.quantity,
                        "price" to price
                    ))
                }

                if (totalAmount <= 0) {
                    return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Order total must be greater than zero"))
                }

                val balStmt = conn.prepareStatement("""
                    SELECT COALESCE(SUM(
                        CASE WHEN type IN ('deposit','refund','transfer_in','ride_payout') THEN amount
                             WHEN type IN ('withdrawal','ride_payment','penalty','platform_fee','transfer_out') THEN -amount
                             ELSE 0 END
                    ), 0.00) AS balance
                    FROM wallet_transactions
                    WHERE user_id = ?::uuid AND status = 'completed'
                """.trimIndent())
                balStmt.setString(1, studentId)
                val balRs = balStmt.executeQuery()
                val currentBalance = if (balRs.next()) balRs.getDouble("balance") else 0.0

                if (currentBalance < totalAmount) {
                    return@post call.respond(HttpStatusCode.PaymentRequired,
                        ErrorResponse("Insufficient wallet balance. Need ₦${totalAmount.toInt()}, have ₦${currentBalance.toInt()}"))
                }

                val newBalance = currentBalance - totalAmount
                val packagePin = String.format("%03d", Random.nextInt(100, 1000))
                val orderId = UUID.randomUUID().toString()

                val itemsJson = Json.encodeToString(resolvedItems.map { m ->
                    JsonObject(mapOf(
                        "productId" to JsonPrimitive(m["productId"] as String),
                        "name" to JsonPrimitive(m["name"] as String),
                        "quantity" to JsonPrimitive(m["quantity"] as Int),
                        "price" to JsonPrimitive(m["price"] as Double)
                    ))
                })

                val reference = "MKT-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
                conn.prepareStatement("""
                    INSERT INTO wallet_transactions (user_id, type, amount, fee, balance_before, balance_after, status, reference, description, metadata)
                    VALUES (?::uuid, 'withdrawal', ?, 0.00, ?, ?, 'completed', ?, ?, ?::jsonb)
                """.trimIndent()).apply {
                    setString(1, studentId)
                    setDouble(2, totalAmount)
                    setDouble(3, currentBalance)
                    setDouble(4, newBalance)
                    setString(5, reference)
                    setString(6, "Payment for marketplace order $orderId")
                    setString(7, """{"order_id":"$orderId","vendor_id":"${req.vendorId}","type":"marketplace_payment"}""")
                    executeUpdate()
                }

                conn.prepareStatement("""
                    INSERT INTO delivery_orders (id, student_id, vendor_id, items, total_amount, delivery_fee, status, package_pin, dropoff_lat, dropoff_lng, notes)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?::jsonb, ?, 0.00, 'pending', ?, ?, ?, ?)
                """.trimIndent()).apply {
                    setString(1, orderId)
                    setString(2, studentId)
                    setString(3, req.vendorId)
                    setString(4, itemsJson)
                    setDouble(5, totalAmount)
                    setString(6, packagePin)
                    if (req.dropoffLat != null) setDouble(7, req.dropoffLat) else setNull(7, java.sql.Types.DOUBLE)
                    if (req.dropoffLng != null) setDouble(8, req.dropoffLng) else setNull(8, java.sql.Types.DOUBLE)
                    if (req.notes != null) setString(9, req.notes) else setNull(9, java.sql.Types.VARCHAR)
                    executeUpdate()
                }

                println("[MARKETPLACE] Order $orderId created by student $studentId — ₦${totalAmount.toInt()}")
                call.respond(HttpStatusCode.Created, mapOf(
                    "orderId" to orderId,
                    "pin" to packagePin,
                    "status" to "pending",
                    "totalAmount" to totalAmount
                ))
            } catch (e: Exception) {
                println("[MARKETPLACE] Order creation error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to place order"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/accept-order
        // ============================================================
        post("/accept-order") {
            val req = try { call.receive<AcceptOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val orderStmt = conn.prepareStatement("""
                    SELECT student_id, vendor_id FROM delivery_orders WHERE id = ?::uuid
                """.trimIndent())
                orderStmt.setString(1, req.orderId)
                val orderRs = orderStmt.executeQuery()
                if (!orderRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Order not found"))
                }
                val studentId = orderRs.getString("student_id")

                val updated = conn.prepareStatement("""
                    UPDATE delivery_orders SET status = 'accepted', updated_at = now()
                    WHERE id = ?::uuid AND status = 'pending'
                """.trimIndent()).apply { setString(1, req.orderId) }.executeUpdate()

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("Order cannot be accepted in its current state"))
                }

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, studentId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "📋 Order Accepted",
                        body = "Your order has been accepted and is being prepared.",
                        platform = tokenRs.getString("platform"),
                        data = mapOf("type" to "order_accepted", "orderId" to req.orderId)
                    )
                }

                println("[MARKETPLACE] Order ${req.orderId} accepted by vendor")
                call.respond(SuccessResponse("Order accepted"))
            } catch (e: Exception) {
                println("[MARKETPLACE] Accept order error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to accept order"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/ready/{orderId}
        // ============================================================
        post("/ready/{orderId}") {
            val orderId = call.parameters["orderId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing orderId"))

            val conn = DatabaseService.getConnection()
            try {
                val updated = conn.prepareStatement("""
                    UPDATE delivery_orders SET status = 'ready_for_pickup', updated_at = now()
                    WHERE id = ?::uuid AND status = 'accepted'
                """.trimIndent()).apply { setString(1, orderId) }.executeUpdate()

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("Order cannot be marked ready in its current state"))
                }

                val vendorStmt = conn.prepareStatement("""
                    SELECT p.full_name FROM delivery_orders d
                    JOIN profiles p ON p.id = d.vendor_id
                    WHERE d.id = ?::uuid
                """.trimIndent())
                vendorStmt.setString(1, orderId)
                val vendorRs = vendorStmt.executeQuery()
                val vendorName = if (vendorRs.next()) vendorRs.getString("full_name") else "A vendor"

                NotificationService.sendToTopic(
                    topic = "drivers",
                    title = "🛵 Pickup Ready — $vendorName",
                    body = "Order ready at $vendorName. Tap to view details and accept delivery.",
                    data = mapOf("type" to "order_ready_for_pickup", "orderId" to orderId)
                )

                println("[MARKETPLACE] Order $orderId marked ready for pickup")
                call.respond(SuccessResponse("Order marked ready for pickup"))
            } catch (e: Exception) {
                println("[MARKETPLACE] Ready order error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to mark order ready"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/assign-driver
        // ============================================================
        post("/assign-driver") {
            val req = try { call.receive<AssignDriverRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val orderStmt = conn.prepareStatement("""
                    SELECT student_id, vendor_id FROM delivery_orders WHERE id = ?::uuid
                """.trimIndent())
                orderStmt.setString(1, req.orderId)
                val orderRs = orderStmt.executeQuery()
                if (!orderRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Order not found"))
                }
                val studentId = orderRs.getString("student_id")
                val vendorId = orderRs.getString("vendor_id")

                val driverStmt = conn.prepareStatement("""
                    SELECT p.id, d.fleet_number FROM profiles p
                    JOIN driver_details d ON d.user_id = p.id
                    WHERE p.id = ?::uuid AND p.role = 'driver'
                """.trimIndent())
                driverStmt.setString(1, req.driverId)
                val driverRs = driverStmt.executeQuery()
                if (!driverRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Driver not found"))
                }
                val fleetNumber = driverRs.getInt("fleet_number")

                val updated = conn.prepareStatement("""
                    UPDATE delivery_orders SET driver_id = ?::uuid, status = 'in_transit', updated_at = now()
                    WHERE id = ?::uuid AND status = 'ready_for_pickup'
                """.trimIndent()).apply {
                    setString(1, req.driverId)
                    setString(2, req.orderId)
                    executeUpdate()
                }

                if (updated == 0) {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("Order cannot be assigned in its current state"))
                }

                for (uid in listOf(vendorId, studentId)) {
                    val tStmt = conn.prepareStatement("""
                        SELECT token, platform FROM notification_tokens
                        WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                    """.trimIndent())
                    tStmt.setString(1, uid)
                    val tRs = tStmt.executeQuery()
                    if (tRs.next()) {
                        val title = if (uid == vendorId) "🛵 Driver Assigned" else "🛵 Out for Delivery"
                        val body = if (uid == vendorId) "Fleet #$fleetNumber assigned to pick up the order."
                        else "Fleet #$fleetNumber is delivering your order."
                        NotificationService.sendPush(
                            token = tRs.getString("token"),
                            title = title,
                            body = body,
                            platform = tRs.getString("platform"),
                            data = mapOf("type" to "driver_assigned", "orderId" to req.orderId)
                        )
                    }
                }

                println("[MARKETPLACE] Driver ${req.driverId} assigned to order ${req.orderId}")
                call.respond(SuccessResponse("Driver assigned for delivery"))
            } catch (e: Exception) {
                println("[MARKETPLACE] Assign driver error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to assign driver"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/deliver
        // ============================================================
        post("/deliver") {
            val req = try { call.receive<DeliverOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body")) }

            val conn = DatabaseService.getConnection()
            try {
                val orderStmt = conn.prepareStatement("""
                    SELECT student_id, package_pin, status FROM delivery_orders WHERE id = ?::uuid
                """.trimIndent())
                orderStmt.setString(1, req.orderId)
                val orderRs = orderStmt.executeQuery()
                if (!orderRs.next()) {
                    return@post call.respond(HttpStatusCode.NotFound, ErrorResponse("Order not found"))
                }

                val storedPin = orderRs.getString("package_pin")
                val currentStatus = orderRs.getString("status")
                val studentId = orderRs.getString("student_id")

                if (currentStatus != "in_transit") {
                    return@post call.respond(HttpStatusCode.Conflict, ErrorResponse("Order is not in transit. Current status: $currentStatus"))
                }
                if (storedPin != req.packagePin) {
                    return@post call.respond(HttpStatusCode.Forbidden, ErrorResponse("Invalid package PIN"))
                }

                conn.prepareStatement("""
                    UPDATE delivery_orders SET status = 'delivered', updated_at = now()
                    WHERE id = ?::uuid
                """.trimIndent()).apply { setString(1, req.orderId) }.executeUpdate()

                val tokenStmt = conn.prepareStatement("""
                    SELECT token, platform FROM notification_tokens
                    WHERE user_id = ?::uuid AND is_active = true ORDER BY created_at DESC LIMIT 1
                """.trimIndent())
                tokenStmt.setString(1, studentId)
                val tokenRs = tokenStmt.executeQuery()
                if (tokenRs.next()) {
                    NotificationService.sendPush(
                        token = tokenRs.getString("token"),
                        title = "✅ Order Delivered",
                        body = "Your order has been delivered. Enjoy!",
                        platform = tokenRs.getString("platform"),
                        data = mapOf("type" to "order_delivered", "orderId" to req.orderId)
                    )
                }

                println("[MARKETPLACE] Order ${req.orderId} delivered")
                call.respond(SuccessResponse("Delivery confirmed"))
            } catch (e: Exception) {
                println("[MARKETPLACE] Deliver error: ${e.message}")
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to confirm delivery"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/products/{vendorId}
        // ============================================================
        get("/products/{vendorId}") {
            val vendorId = call.parameters["vendorId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing vendorId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, name, description, price, is_available, image_url
                    FROM vendor_products
                    WHERE vendor_id = ?::uuid
                    ORDER BY name ASC
                """.trimIndent())
                stmt.setString(1, vendorId)
                val rs = stmt.executeQuery()

                val products = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    products.add(mapOf(
                        "id" to rs.getString("id"),
                        "name" to rs.getString("name"),
                        "description" to (rs.getString("description") ?: ""),
                        "price" to rs.getDouble("price"),
                        "isAvailable" to rs.getBoolean("is_available"),
                        "imageUrl" to (rs.getString("image_url") ?: "")
                    ))
                }

                call.respond(products)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch products"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/vendors
        // ============================================================
        get("/vendors") {
            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.createStatement().executeQuery("""
                    SELECT id, full_name, phone, email
                    FROM profiles
                    WHERE role = 'vendor'
                    ORDER BY full_name ASC
                """.trimIndent())

                val vendors = mutableListOf<Map<String, Any?>>()
                while (stmt.next()) {
                    vendors.add(mapOf(
                        "id" to stmt.getString("id"),
                        "fullName" to stmt.getString("full_name"),
                        "phone" to (stmt.getString("phone") ?: ""),
                        "email" to (stmt.getString("email") ?: "")
                    ))
                }
                call.respond(vendors)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch vendors"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/orders/{orderId}
        // ============================================================
        get("/orders/{orderId}") {
            val orderId = call.parameters["orderId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing orderId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT d.id, d.total_amount, d.status, d.package_pin, d.items, d.created_at,
                           vp.full_name AS vendor_name,
                           dp.full_name AS driver_name,
                           dd.fleet_number
                    FROM delivery_orders d
                    JOIN profiles vp ON vp.id = d.vendor_id
                    LEFT JOIN profiles dp ON dp.id = d.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = d.driver_id
                    WHERE d.id = ?::uuid
                """.trimIndent())
                stmt.setString(1, orderId)
                val rs = stmt.executeQuery()

                if (!rs.next()) {
                    return@get call.respond(HttpStatusCode.NotFound, ErrorResponse("Order not found"))
                }

                val driverName = rs.getString("driver_name")
                val driverDisplay = if (driverName != null) {
                    "${driverName} (Fleet #${rs.getInt("fleet_number")})"
                } else null

                call.respond(OrderSummary(
                    id = rs.getString("id"),
                    vendorName = rs.getString("vendor_name"),
                    items = listOf(),
                    totalAmount = rs.getDouble("total_amount"),
                    status = rs.getString("status"),
                    packagePin = rs.getString("package_pin"),
                    driverName = driverDisplay,
                    createdAt = rs.getTimestamp("created_at").toInstant().toString()
                ))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch order"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/my-orders
        // ============================================================
        get("/my-orders") {
            val studentId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT d.id, d.total_amount, d.status, d.package_pin, d.items, d.created_at,
                           vp.full_name AS vendor_name,
                           dp.full_name AS driver_name,
                           dd.fleet_number
                    FROM delivery_orders d
                    JOIN profiles vp ON vp.id = d.vendor_id
                    LEFT JOIN profiles dp ON dp.id = d.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = d.driver_id
                    WHERE d.student_id = ?::uuid
                    ORDER BY d.created_at DESC
                """.trimIndent())
                stmt.setString(1, studentId)
                val rs = stmt.executeQuery()

                val orders = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    val driverName = rs.getString("driver_name")
                    val driverDisplay = if (driverName != null) {
                        "${driverName} (Fleet #${rs.getInt("fleet_number")})"
                    } else null

                    orders.add(mapOf(
                        "id" to rs.getString("id"),
                        "vendorName" to rs.getString("vendor_name"),
                        "totalAmount" to rs.getDouble("total_amount"),
                        "status" to rs.getString("status"),
                        "packagePin" to (rs.getString("package_pin") ?: ""),
                        "driverName" to (driverDisplay ?: ""),
                        "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(orders)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch orders"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/vendor-orders
        // ============================================================
        get("/vendor-orders") {
            val vendorId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT d.id, d.total_amount, d.status, d.items, d.created_at,
                           sp.full_name AS student_name,
                           dp.full_name AS driver_name,
                           dd.fleet_number
                    FROM delivery_orders d
                    JOIN profiles sp ON sp.id = d.student_id
                    LEFT JOIN profiles dp ON dp.id = d.driver_id
                    LEFT JOIN driver_details dd ON dd.user_id = d.driver_id
                    WHERE d.vendor_id = ?::uuid
                    ORDER BY d.created_at DESC
                """.trimIndent())
                stmt.setString(1, vendorId)
                val rs = stmt.executeQuery()

                val orders = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    orders.add(mapOf(
                        "id" to rs.getString("id"),
                        "studentName" to rs.getString("student_name"),
                        "totalAmount" to rs.getDouble("total_amount"),
                        "status" to rs.getString("status"),
                        "driverName" to (rs.getString("driver_name") ?: ""),
                        "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(orders)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch orders"))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/driver-deliveries
        // ============================================================
        get("/driver-deliveries") {
            val driverId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT d.id, d.total_amount, d.status, d.package_pin, d.items, d.created_at,
                           vp.full_name AS vendor_name,
                           sp.full_name AS student_name,
                           sp.phone AS student_phone
                    FROM delivery_orders d
                    JOIN profiles vp ON vp.id = d.vendor_id
                    JOIN profiles sp ON sp.id = d.student_id
                    WHERE d.driver_id = ?::uuid
                    ORDER BY d.created_at DESC
                """.trimIndent())
                stmt.setString(1, driverId)
                val rs = stmt.executeQuery()

                val orders = mutableListOf<Map<String, Any?>>()
                while (rs.next()) {
                    orders.add(mapOf(
                        "id" to rs.getString("id"),
                        "vendorName" to rs.getString("vendor_name"),
                        "studentName" to rs.getString("student_name"),
                        "studentPhone" to (rs.getString("student_phone") ?: ""),
                        "packagePin" to (rs.getString("package_pin") ?: ""),
                        "totalAmount" to rs.getDouble("total_amount"),
                        "status" to rs.getString("status"),
                        "createdAt" to rs.getTimestamp("created_at").toInstant().toString()
                    ))
                }

                call.respond(orders)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to fetch deliveries"))
            } finally {
                conn.close()
            }
        }
    }
}
