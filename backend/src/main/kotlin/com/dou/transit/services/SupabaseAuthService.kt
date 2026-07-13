package com.dou.transit.services

import com.dou.transit.config.AppConfig
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable

/**
 * Service for interacting with Supabase Auth REST API.
 * Used to create users, sign in, and manage auth identities.
 */
object SupabaseAuthService {
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true })
        }
    }

    private val supabaseUrl = AppConfig.supabaseUrl
    private val serviceRoleKey = AppConfig.supabaseServiceKey

    @Serializable
    data class SignUpRequest(
        val email: String,
        val password: String,
        val options: Options? = null
    )

    @Serializable
    data class Options(
        val data: Map<String, String>? = null
    )

    @Serializable
    data class SignUpResponse(
        val id: String? = null,
        val user: UserInfo? = null,
        val error: String? = null,
        val error_description: String? = null
    )

    @Serializable
    data class UserInfo(
        val id: String,
        val email: String? = null,
        val phone: String? = null,
        val user_metadata: Map<String, String>? = null
    )

    @Serializable
    data class SignInRequest(
        val email: String,
        val password: String
    )

    @Serializable
    data class SignInResponse(
        val access_token: String? = null,
        val user: UserInfo? = null,
        val error: String? = null,
        val error_description: String? = null
    )

    @Serializable
    data class AdminCreateUserRequest(
        val email: String,
        val password: String,
        val email_confirm: Boolean = true,
        val user_metadata: Map<String, String>? = null
    )

    @Serializable
    data class AdminCreateUserResponse(
        val id: String? = null,
        val error: String? = null,
        val error_description: String? = null
    )

    data class AuthResult(
        val userId: String?,
        val token: String?,
        val error: String? = null
    )

    /**
     * Sign up a new user via Supabase Auth REST API.
     */
    suspend fun signUp(email: String, password: String, metadata: Map<String, String>? = null): AuthResult {
        return try {
            val response = client.post("$supabaseUrl/auth/v1/signup") {
                header("apikey", serviceRoleKey)
                header("Content-Type", "application/json")
                setBody(SignUpRequest(
                    email = email,
                    password = password,
                    options = if (metadata != null) Options(data = metadata) else null
                ))
            }

            if (response.status == HttpStatusCode.OK || response.status == HttpStatusCode.Created) {
                val body = response.body<SignUpResponse>()
                if (body.id != null || body.user?.id != null) {
                    val uid = body.id ?: body.user!!.id
                    // Generate a simple token (in production use proper JWT)
                    val token = "sb_${uid}_${System.currentTimeMillis()}"
                    AuthResult(uid, token)
                } else {
                    AuthResult(null, null, body.error ?: body.error_description ?: "Signup failed")
                }
            } else {
                val body = try { response.body<SignUpResponse>() } catch (_: Exception) { null }
                AuthResult(null, null, body?.error ?: "HTTP ${response.status.value}")
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error")
        }
    }

    /**
     * Admin creates a user directly (bypasses email confirmation).
     * Used for admin/security/vendor/developer accounts created by the admin.
     */
    suspend fun adminCreateUser(email: String, password: String, metadata: Map<String, String>? = null): AuthResult {
        return try {
            val response = client.post("$supabaseUrl/auth/v1/admin/users") {
                header("apikey", serviceRoleKey)
                header("Authorization", "Bearer $serviceRoleKey")
                header("Content-Type", "application/json")
                setBody(AdminCreateUserRequest(
                    email = email,
                    password = password,
                    email_confirm = true,
                    user_metadata = metadata
                ))
            }

            if (response.status == HttpStatusCode.OK || response.status == HttpStatusCode.Created) {
                val body = response.body<AdminCreateUserResponse>()
                if (body.id != null) {
                    val token = "sb_${body.id}_${System.currentTimeMillis()}"
                    AuthResult(body.id, token)
                } else {
                    AuthResult(null, null, body.error ?: "Admin create failed")
                }
            } else {
                AuthResult(null, null, "HTTP ${response.status.value}")
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error")
        }
    }

    /**
     * Sign in with email and password.
     */
    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            val response = client.post("$supabaseUrl/auth/v1/token?grant_type=password") {
                header("apikey", serviceRoleKey)
                header("Content-Type", "application/json")
                setBody(SignInRequest(email = email, password = password))
            }

            if (response.status == HttpStatusCode.OK) {
                val body = response.body<SignInResponse>()
                if (body.access_token != null && body.user?.id != null) {
                    AuthResult(body.user!!.id, body.access_token)
                } else {
                    AuthResult(null, null, body.error ?: body.error_description ?: "Login failed")
                }
            } else {
                val body = try { response.body<SignInResponse>() } catch (_: Exception) { null }
                AuthResult(null, null, body?.error ?: "Invalid credentials")
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error")
        }
    }
}
