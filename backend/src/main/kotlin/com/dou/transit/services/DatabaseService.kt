package com.dou.transit.services

import com.dou.transit.config.AppConfig
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection
import java.sql.Timestamp
import java.time.Instant

/**
 * Database connection pool service.
 * Connects to Supabase PostgreSQL via connection pooler.
 */
object DatabaseService {
    private var dataSource: HikariDataSource? = null
    private var initError: String? = null

    init {
        initPool()
    }

    @Synchronized
    fun initPool() {
        if (dataSource != null && !dataSource!!.isClosed) return
        try {
            val config = HikariConfig().apply {
                val url = AppConfig.supabaseDbUrl
                    .replace("aws-0-eu-west-1.pooler.supabase.com", "aws-0-eu-west-3.pooler.supabase.com")
                println("[DB] Raw DATABASE_URL (masked): ${url.replace(Regex("password=[^&]*"), "password=***")}")

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
                    // HikariCP / PgBouncer need user & password as connection properties,
                    // not just JDBC URL query params, for correct tenant routing.
                    val queryStart = url.indexOf('?')
                    val baseUrl: String
                    val params: MutableMap<String, String>

                    if (queryStart >= 0) {
                        baseUrl = url.substring(0, queryStart)
                        params = url.substring(queryStart + 1)
                            .split("&")
                            .associate {
                                val (k, v) = it.split("=", limit = 2)
                                k to java.net.URLDecoder.decode(v, "UTF-8")
                            }
                            .toMutableMap()
                    } else {
                        baseUrl = url
                        params = mutableMapOf()
                    }

                    // Extract user/password from query params and set as HikariCP properties
                    params.remove("user")?.let { username = it }
                    params.remove("password")?.let { password = it }

                    // Ensure sslmode is present
                    if (!params.containsKey("sslmode")) {
                        params["sslmode"] = "require"
                    }

                    // Rebuild JDBC URL without user/password in query string
                    val cleanQuery = params.entries.joinToString("&") { "${it.key}=${it.value}" }
                    jdbcUrl = if (cleanQuery.isNotEmpty()) "$baseUrl?$cleanQuery" else baseUrl
                }

                println("[DB] Final JDBC URL: ${jdbcUrl?.replace(Regex("password=[^&]*"), "password=***")}")
                println("[DB] Username: $username")

                maximumPoolSize = 10
                minimumIdle = 2
                idleTimeout = 30000
                connectionTimeout = 10000
                maxLifetime = 600000
                isAutoCommit = true
                driverClassName = "org.postgresql.Driver"
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
        val ds = dataSource ?: throw IllegalStateException("Database failed to initialize: $initError")
        return ds.connection
    }

    fun getInitError(): String? = initError

    fun close() {
        dataSource?.close()
    }
}
