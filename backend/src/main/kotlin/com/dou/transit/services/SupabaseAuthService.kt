package com.dou.transit.services

import com.dou.transit.config.AppConfig
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

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

    private val supabaseUrl get() = AppConfig.supabaseUrl
    private val serviceRoleKey get() = AppConfig.supabaseServiceKey

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

            if (response.status.isSuccess()) {
                val body = response.body<SignUpResponse>()
                val uid = body.id ?: body.user?.id
                if (uid != null) {
                    val token = "sb_${uid}_${System.currentTimeMillis()}"
                    AuthResult(uid, token)
                } else {
                    AuthResult(null, null, body.error ?: body.error_description ?: "Signup failed")
                }
            } else {
                val body = try { response.body<SignUpResponse>() } catch (_: Exception) { null }
                AuthResult(null, null, body?.error ?: body?.error_description ?: "HTTP ${response.status.value}")
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error connecting to Auth")
        }
    }

    /**
     * Admin creates a user directly (bypasses email confirmation).
     * Used for student/driver/vendor accounts.
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

            if (response.status.isSuccess()) {
                val body = response.body<AdminCreateUserResponse>()
                if (body.id != null) {
                    val token = "sb_${body.id}_${System.currentTimeMillis()}"
                    AuthResult(body.id, token)
                } else {
                    AuthResult(null, null, body.error ?: body.error_description ?: "User creation failed")
                }
            } else {
                // If user already exists, attempt standard sign-in to retrieve ID
                val signInResult = signIn(email, password)
                if (signInResult.userId != null) {
                    signInResult
                } else {
                    val body = try { response.body<AdminCreateUserResponse>() } catch (_: Exception) { null }
                    AuthResult(null, null, body?.error ?: body?.error_description ?: "HTTP ${response.status.value}")
                }
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error connecting to Auth")
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

            if (response.status.isSuccess()) {
                val body = response.body<SignInResponse>()
                if (body.access_token != null && body.user?.id != null) {
                    AuthResult(body.user.id, body.access_token)
                } else {
                    AuthResult(null, null, body.error ?: body.error_description ?: "Login failed")
                }
            } else {
                val body = try { response.body<SignInResponse>() } catch (_: Exception) { null }
                AuthResult(null, null, body?.error ?: body?.error_description ?: "Invalid credentials")
            }
        } catch (e: Exception) {
            AuthResult(null, null, e.message ?: "Network error connecting to Auth")
        }
    }
}
