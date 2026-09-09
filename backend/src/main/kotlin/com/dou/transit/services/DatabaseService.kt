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
    private val dataSource: HikariDataSource

    init {
        val config = HikariConfig().apply {
            val url = AppConfig.supabaseDbUrl
            
            // Render/Supabase provides postgres://user:pass@host:port/db
            // JDBC requires jdbc:postgresql://host:port/db with username/password passed separately
            if (url.contains("@")) {
                val cleanUrl = url.replaceFirst("jdbc:", "") // in case they added jdbc: manually
                val uri = java.net.URI(cleanUrl)
                jdbcUrl = "jdbc:postgresql://${uri.host}:${uri.port}${uri.path}"
                
                uri.userInfo?.let { info ->
                    if (info.contains(":")) {
                        username = info.substringBefore(":")
                        password = info.substringAfter(":")
                    } else {
                        username = info
                    }
                }
            } else {
                jdbcUrl = url
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
    }

    fun getConnection(): Connection = dataSource.connection

    fun close() {
        dataSource.close()
    }
}
