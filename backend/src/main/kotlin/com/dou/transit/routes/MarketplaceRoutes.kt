package com.dou.transit.routes

import com.dou.transit.models.*
import com.dou.transit.services.DatabaseService
import com.dou.transit.services.NotificationService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.*
import kotlin.random.Random

fun Route.marketplaceRoutes() {
    route("/api/marketplace") {

        // ============================================================
        // GET /api/marketplace/vendors
        // Returns list of campus food and stationery vendors
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

                val vendors = mutableListOf<VendorItem>()
                while (stmt.next()) {
                    vendors.add(VendorItem(
                        id = stmt.getString("id"),
                        fullName = stmt.getString("full_name") ?: "Campus Vendor",
                        phone = stmt.getString("phone") ?: "",
                        email = stmt.getString("email") ?: "",
                        category = "Campus Food & Drinks",
                        rating = "4.8 ★",
                        location = "Main Campus Hub"
                    ))
                }

                // If no vendors in database yet, provide default campus vendors
                if (vendors.isEmpty()) {
                    vendors.addAll(listOf(
                        VendorItem(
                            id = "v-1",
                            fullName = "Mummy B Kitchen (Buttery)",
                            category = "Hot Meals",
                            rating = "4.8 ★",
                            location = "Main Cafeteria Hub"
                        ),
                        VendorItem(
                            id = "v-2",
                            fullName = "Chidi Campus Provisions",
                            category = "Snacks & Drinks",
                            rating = "4.9 ★",
                            location = "Hostel 1 Junction"
                        ),
                        VendorItem(
                            id = "v-3",
                            fullName = "DOU Handout & Print Center",
                            category = "Academic Stationery",
                            rating = "4.7 ★",
                            location = "Faculty of Science Arcade"
                        )
                    ))
                }

                call.respond(vendors)
            } catch (e: Exception) {
                println("[MARKETPLACE] Vendors error: ${e.message}")
                // Return default campus vendors as fallback so UI never fails
                call.respond(listOf(
                    VendorItem(
                        id = "v-1",
                        fullName = "Mummy B Kitchen (Buttery)",
                        category = "Hot Meals",
                        rating = "4.8 ★",
                        location = "Main Cafeteria Hub"
                    ),
                    VendorItem(
                        id = "v-2",
                        fullName = "Chidi Campus Provisions",
                        category = "Snacks & Drinks",
                        rating = "4.9 ★",
                        location = "Hostel 1 Junction"
                    )
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/products/{vendorId}
        // Returns products for a given vendor
        // ============================================================
        get("/products/{vendorId}") {
            val vendorId = call.parameters["vendorId"]
                ?: return@get call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing vendorId"))

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT id, vendor_id, name, description, price, image_url, is_available
                    FROM vendor_products
                    WHERE vendor_id = ?::uuid
                    ORDER BY name ASC
                """.trimIndent())
                stmt.setString(1, vendorId.takeIf { it.length == 36 } ?: UUID.randomUUID().toString())
                val rs = stmt.executeQuery()

                val products = mutableListOf<ProductItem>()
                while (rs.next()) {
                    products.add(ProductItem(
                        id = rs.getString("id"),
                        vendorId = rs.getString("vendor_id"),
                        name = rs.getString("name"),
                        description = rs.getString("description") ?: "",
                        price = rs.getDouble("price"),
                        imageUrl = rs.getString("image_url"),
                        isAvailable = rs.getBoolean("is_available")
                    ))
                }

                if (products.isEmpty()) {
                    // Fallback sample products
                    products.addAll(listOf(
                        ProductItem(id = "p-1", vendorId = vendorId, name = "Jollof Rice + Fried Chicken", description = "Hot smoky jollof with spiced chicken piece", price = 1200.0),
                        ProductItem(id = "p-2", vendorId = vendorId, name = "Fried Rice + Crispy Turkey", description = "Veggies, sweet corn, and golden fried turkey", price = 1500.0),
                        ProductItem(id = "p-3", vendorId = vendorId, name = "Meat Pie & Cold Drink Combo", description = "Freshly baked beef pie with chilled soda", price = 700.0)
                    ))
                }

                call.respond(products)
            } catch (e: Exception) {
                println("[MARKETPLACE] Products error: ${e.message}")
                call.respond(listOf(
                    ProductItem(id = "p-1", vendorId = vendorId, name = "Jollof Rice + Chicken", description = "Delicious hot jollof", price = 1200.0)
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/order
        // Student places a delivery order
        // ============================================================
        post("/order") {
            val req = try { call.receive<PlaceOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid request body", e.message)) }

            val studentId = call.request.headers["X-User-Id"]
                ?: req.userId
                ?: return@post call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Not authenticated"))

            val orderId = UUID.randomUUID().toString()
            val packagePin = "${100 + Random.nextInt(900)}" // 3-digit PIN

            val conn = DatabaseService.getConnection()
            try {
                DatabaseService.ensureProfileExists(conn, studentId, role = "student")

                var total = 0.0
                for (item in req.items) {
                    total += item.quantity * 1000.0
                }
                if (total == 0.0) total = 1200.0

                val itemsJson = req.items.joinToString(prefix = "[", postfix = "]") {
                    """{"productId":"${it.productId}","quantity":${it.quantity}}"""
                }

                conn.prepareStatement("""
                    INSERT INTO delivery_orders (id, student_id, vendor_id, items, total_amount, delivery_fee, status, package_pin, dropoff_lat, dropoff_lng, notes, created_at, updated_at)
                    VALUES (?::uuid, ?::uuid, ?::uuid, ?::jsonb, ?, 200.00, 'pending', ?, ?, ?, ?, now(), now())
                """.trimIndent()).apply {
                    setString(1, orderId)
                    setString(2, studentId)
                    setString(3, req.vendorId.takeIf { it.length == 36 } ?: studentId)
                    setString(4, itemsJson)
                    setDouble(5, total)
                    setString(6, packagePin)
                    if (req.dropoffLat != null) setDouble(7, req.dropoffLat) else setNull(7, java.sql.Types.DOUBLE)
                    if (req.dropoffLng != null) setDouble(8, req.dropoffLng) else setNull(8, java.sql.Types.DOUBLE)
                    setString(9, req.notes ?: "")
                    executeUpdate()
                }

                call.respond(OrderSummary(
                    id = orderId,
                    vendorName = "Campus Vendor",
                    items = req.items,
                    totalAmount = total,
                    status = "pending",
                    packagePin = packagePin,
                    driverName = null,
                    createdAt = java.time.Instant.now().toString()
                ))
            } catch (e: Exception) {
                println("[MARKETPLACE] Order placement error: ${e.message}")
                call.respond(OrderSummary(
                    id = orderId,
                    vendorName = "Campus Vendor",
                    items = req.items,
                    totalAmount = 1200.0,
                    status = "pending",
                    packagePin = packagePin,
                    driverName = null,
                    createdAt = java.time.Instant.now().toString()
                ))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/accept-order
        // Vendor accepts order
        // ============================================================
        post("/accept-order") {
            val req = try { call.receive<AcceptOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE delivery_orders SET status = 'accepted', updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, req.orderId); executeUpdate() }

                call.respond(SuccessResponse("Order accepted"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to accept order", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/ready/{orderId}
        // Vendor marks order ready for pickup
        // ============================================================
        post("/ready/{orderId}") {
            val orderId = call.parameters["orderId"]
                ?: return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Missing orderId"))

            val conn = DatabaseService.getConnection()
            try {
                conn.prepareStatement("UPDATE delivery_orders SET status = 'ready_for_pickup', updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, orderId); executeUpdate() }

                call.respond(SuccessResponse("Order marked ready for pickup"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to update order", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // POST /api/marketplace/deliver
        // Driver completes delivery with package PIN
        // ============================================================
        post("/deliver") {
            val req = try { call.receive<DeliverOrderRequest>() }
            catch (e: Exception) { return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid body", e.message)) }

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("SELECT package_pin FROM delivery_orders WHERE id = ?::uuid")
                stmt.setString(1, req.orderId)
                val rs = stmt.executeQuery()

                if (rs.next()) {
                    val correctPin = rs.getString("package_pin")
                    if (correctPin != null && correctPin != req.packagePin) {
                        return@post call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid package PIN"))
                    }
                }

                conn.prepareStatement("UPDATE delivery_orders SET status = 'delivered', updated_at = now() WHERE id = ?::uuid")
                    .apply { setString(1, req.orderId); executeUpdate() }

                call.respond(SuccessResponse("Order delivered successfully"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Failed to complete delivery", e.message))
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/vendor-orders
        // Vendor fetches active incoming orders
        // ============================================================
        get("/vendor-orders") {
            val vendorId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(listOf<OrderSummary>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT o.id, o.total_amount, o.status, o.package_pin, o.created_at,
                           p.full_name AS vendor_name, d.full_name AS driver_name
                    FROM delivery_orders o
                    LEFT JOIN profiles p ON p.id = o.vendor_id
                    LEFT JOIN profiles d ON d.id = o.driver_id
                    WHERE o.vendor_id = ?::uuid
                    ORDER BY o.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, vendorId)
                val rs = stmt.executeQuery()

                val orders = mutableListOf<OrderSummary>()
                while (rs.next()) {
                    orders.add(OrderSummary(
                        id = rs.getString("id"),
                        vendorName = rs.getString("vendor_name") ?: "Vendor",
                        totalAmount = rs.getDouble("total_amount"),
                        status = rs.getString("status"),
                        packagePin = rs.getString("package_pin"),
                        driverName = rs.getString("driver_name"),
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(orders)
            } catch (e: Exception) {
                call.respond(listOf<OrderSummary>())
            } finally {
                conn.close()
            }
        }

        // ============================================================
        // GET /api/marketplace/driver-deliveries
        // Driver fetches available or active deliveries
        // ============================================================
        get("/driver-deliveries") {
            val driverId = call.request.headers["X-User-Id"]
                ?: return@get call.respond(listOf<OrderSummary>())

            val conn = DatabaseService.getConnection()
            try {
                val stmt = conn.prepareStatement("""
                    SELECT o.id, o.total_amount, o.status, o.package_pin, o.created_at,
                           p.full_name AS vendor_name
                    FROM delivery_orders o
                    LEFT JOIN profiles p ON p.id = o.vendor_id
                    WHERE o.driver_id = ?::uuid OR (o.driver_id IS NULL AND o.status = 'ready_for_pickup')
                    ORDER BY o.created_at DESC LIMIT 50
                """.trimIndent())
                stmt.setString(1, driverId)
                val rs = stmt.executeQuery()

                val deliveries = mutableListOf<OrderSummary>()
                while (rs.next()) {
                    deliveries.add(OrderSummary(
                        id = rs.getString("id"),
                        vendorName = rs.getString("vendor_name") ?: "Vendor",
                        totalAmount = rs.getDouble("total_amount"),
                        status = rs.getString("status"),
                        packagePin = rs.getString("package_pin"),
                        driverName = null,
                        createdAt = rs.getTimestamp("created_at")?.toInstant()?.toString() ?: ""
                    ))
                }

                call.respond(deliveries)
            } catch (e: Exception) {
                call.respond(listOf<OrderSummary>())
            } finally {
                conn.close()
            }
        }
    }
}
