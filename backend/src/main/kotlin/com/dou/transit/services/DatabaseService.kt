package com.dou.transit.services

import com.dou.transit.config.AppConfig
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection
import java.util.UUID

/**
 * Database connection pool service.
 * Connects to Supabase PostgreSQL via connection pooler (port 6543) or direct connection.
 */
object DatabaseService {
    @Volatile
    private var dataSource: HikariDataSource? = null
    @Volatile
    private var initError: String? = null

    init {
        initPool()
    }

    @Synchronized
    fun initPool() {
        if (dataSource != null && !dataSource!!.isClosed) return
        try {
            val url = AppConfig.supabaseDbUrl
                .replace("aws-0-eu-west-1.pooler.supabase.com", "aws-0-eu-west-3.pooler.supabase.com")
            println("[DB] Initializing Hikari pool with URL: ${url.replace(Regex("password=[^&]*"), "password=***")}")

            val config = HikariConfig().apply {
                if (url.contains("@")) {
                    // Format: jdbc:postgresql://user:pass@host:port/db
                    val cleanUrl = url.replaceFirst("jdbc:", "")
                    val uri = java.net.URI(cleanUrl)

                    var queryPart = uri.query ?: ""
                    if (!queryPart.contains("sslmode=")) {
                        queryPart += if (queryPart.isEmpty()) "sslmode=require" else "&sslmode=require"
                    }

                    jdbcUrl = "jdbc:postgresql://${uri.host}:${uri.port}${uri.path}?$queryPart"

                    uri.userInfo?.let { info ->
                        if (info.contains(":")) {
                            username = info.substringBefore(":")
                            password = java.net.URLDecoder.decode(info.substringAfter(":"), "UTF-8")
                        } else {
                            username = info
                        }
                    }
                } else {
                    // Format: jdbc:postgresql://host:port/db?user=X&password=Y
                    val queryStart = url.indexOf('?')
                    val baseUrl: String
                    val params: MutableMap<String, String>

                    if (queryStart >= 0) {
                        baseUrl = url.substring(0, queryStart)
                        params = url.substring(queryStart + 1)
                            .split("&")
                            .filter { it.contains("=") }
                            .associate {
                                val (k, v) = it.split("=", limit = 2)
                                k to java.net.URLDecoder.decode(v, "UTF-8")
                            }
                            .toMutableMap()
                    } else {
                        baseUrl = url
                        params = mutableMapOf()
                    }

                    // Extract user/password from query params and set as properties
                    params.remove("user")?.let { username = it }
                    params.remove("password")?.let { password = it }

                    if (username.isNullOrBlank()) {
                        username = "postgres.uawbhgrxmvwrhncpophm"
                    }
                    if (password.isNullOrBlank()) {
                        password = AppConfig.supabaseDbPassword
                    }

                    if (!params.containsKey("sslmode")) {
                        params["sslmode"] = "require"
                    }

                    val cleanQuery = params.entries.joinToString("&") { "${it.key}=${it.value}" }
                    jdbcUrl = if (cleanQuery.isNotEmpty()) "$baseUrl?$cleanQuery" else baseUrl
                }

                maximumPoolSize = 10
                minimumIdle = 1
                idleTimeout = 30000
                connectionTimeout = 10000
                maxLifetime = 600000
                isAutoCommit = true
                driverClassName = "org.postgresql.Driver"

                addDataSourceProperty("tcpKeepAlive", "true")
                addDataSourceProperty("reWriteBatchedInserts", "true")
            }

            dataSource = HikariDataSource(config)
            initError = null
            println("[DB] Connection pool initialized successfully")
        } catch (e: Exception) {
            println("[DB] Failed to initialize connection pool: ${e.message}")
            e.printStackTrace()
            initError = e.message
        }
    }

    fun getConnection(): Connection {
        if (dataSource == null || dataSource!!.isClosed) {
            initPool()
        }
        val ds = dataSource ?: throw IllegalStateException("Database pool unavailable: $initError")
        return ds.connection
    }

    fun isHealthy(): Boolean {
        return try {
            getConnection().use { conn ->
                !conn.isClosed && conn.isValid(2)
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Ensures that a user profile exists in the `profiles` table to prevent
     * foreign key constraint violations when operations like wallet deposits happen.
     */
    fun ensureProfileExists(
        conn: Connection,
        userId: String,
        role: String = "student",
        fullName: String = "DOU User",
        phone: String? = null,
        email: String? = null
    ) {
        try {
            val checkStmt = conn.prepareStatement("SELECT id FROM profiles WHERE id = ?::uuid LIMIT 1")
            checkStmt.setString(1, userId)
            val rs = checkStmt.executeQuery()
            if (!rs.next()) {
                val effectiveEmail = email ?: "${userId.take(8)}@student.dou.edu.ng"
                val insertStmt = conn.prepareStatement("""
                    INSERT INTO profiles (id, role, full_name, phone, email, created_at, updated_at)
                    VALUES (?::uuid, ?, ?, ?, ?, now(), now())
                    ON CONFLICT (id) DO NOTHING
                """.trimIndent())
                insertStmt.setString(1, userId)
                insertStmt.setString(2, role)
                insertStmt.setString(3, fullName)
                insertStmt.setString(4, phone)
                insertStmt.setString(5, effectiveEmail)
                insertStmt.executeUpdate()
            }
        } catch (e: Exception) {
            println("[DB] Warning: ensureProfileExists for $userId: ${e.message}")
        }
    }

    fun getInitError(): String? = initError

    fun close() {
        dataSource?.close()
        dataSource = null
    }
}
