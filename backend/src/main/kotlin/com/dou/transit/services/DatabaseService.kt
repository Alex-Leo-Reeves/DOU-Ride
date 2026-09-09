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
        try {
            val config = HikariConfig().apply {
                val url = AppConfig.supabaseDbUrl
                
                if (url.contains("@")) {
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
                            password = info.substringAfter(":")
                        } else {
                            username = info
                        }
                    }
                } else {
                    jdbcUrl = if (url.contains("sslmode=")) url else {
                        if (url.contains("?")) "$url&sslmode=require" else "$url?sslmode=require"
                    }
                }
                
                maximumPoolSize = 10
                minimumIdle = 2
                idleTimeout = 30000
                connectionTimeout = 10000
                maxLifetime = 600000
                isAutoCommit = true
                driverClassName = "org.postgresql.Driver"
            }
            dataSource = HikariDataSource(config)
            println("[DB] Connection pool initialized")
        } catch (e: Exception) {
            println("[DB] Failed to initialize connection pool: ${e.message}")
            e.printStackTrace()
            initError = e.message
        }
    }

    fun getConnection(): Connection {
        val ds = dataSource ?: throw IllegalStateException("Database failed to initialize: $initError")
        return ds.connection
    }

    fun close() {
        dataSource?.close()
    }
}
