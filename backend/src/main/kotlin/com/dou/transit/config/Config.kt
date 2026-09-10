package com.dou.transit.config

/**
 * Application configuration loaded from environment variables with
 * production-ready defaults from project specifications.
 */
object AppConfig {
    // Server
    val port: Int = System.getenv("PORT")?.toIntOrNull() ?: 8080

    // Supabase Credentials
    val supabaseUrl: String = System.getenv("SUPABASE_URL")
        ?: "https://uawbhgrxmvwrhncpophm.supabase.co"

    val supabasePublishableKey: String = System.getenv("SUPABASE_PUBLISHABLE_KEY")
        ?: System.getenv("SUPABASE_ANON_KEY")
        ?: "sb_publishable_yvinBjMZ5GjGWlCcNNIrXg_dcr3j9ko"

    val supabaseServiceKey: String = System.getenv("SUPABASE_SECRET_KEY")
        ?: System.getenv("SUPABASE_SERVICE_ROLE_KEY")
        ?: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhd2JoZ3J4bXZ3cmhuY3BvcGhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzg5NTY1NiwiZXhwIjoyMDk5NDcxNjU2fQ.Ehgn9JGlTHoCkCxHml5QzXBpLaW1_ZRZoHjS3liDFsY"

    val supabaseJwksUrl: String = System.getenv("SUPABASE_JWKS_URL")
        ?: "$supabaseUrl/auth/v1/.well-known/jwks.json"

    val supabaseDbPassword: String = System.getenv("SUPABASE_DB_PASSWORD")
        ?: "iammasteralexd1$"

    val supabaseDbUrl: String = (System.getenv("DATABASE_URL")
        ?: "jdbc:postgresql://aws-0-eu-west-3.pooler.supabase.com:6543/postgres?user=postgres.uawbhgrxmvwrhncpophm&password=$supabaseDbPassword")
        .replace("aws-0-eu-west-1.pooler.supabase.com", "aws-0-eu-west-3.pooler.supabase.com")

    // Flutterwave Credentials
    val flutterwaveSecretKey: String = System.getenv("FLUTTERWAVE_SECRET_KEY")
        ?: "FLWSECK-c42723ba8c0d1c134e82319136c22d57-19eacb66583vt-X"

    val flutterwavePublicKey: String = System.getenv("VITE_FLUTTERWAVE_PUBLIC_KEY")
        ?: "FLWPUBK-9acd4c40844063acf3e892f473da58b9-X"

    val flutterwaveSecretHash: String = System.getenv("FLUTTERWAVE_SECRET_HASH")
        ?: "i_am_masteralexd1"

    // Firebase / FCM
    val firebaseServiceAccountJson: String? = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    // OSRM
    val osrmUrl: String = System.getenv("OSRM_PRIVATE_URL")
        ?: System.getenv("OSRM_URL")
        ?: "https://dockerfile-dwb2.onrender.com"

    // JWT Secret for developer access
    val jwtSecret: String = System.getenv("JWT_SECRET") ?: "dou-transit-jwt-secret-2026"

    // Fees and Thresholds (in Naira)
    const val platformFeeNaira: Double = 10.0
    const val minDeposit: Double = 100.0
    const val dropFare: Double = 1500.0
    const val noShowPenalty: Double = 50.0
    const val abuseFine: Double = 5000.0
    const val lateCountdownSeconds: Int = 120

    // Backend base URL for webhook callbacks
    val baseUrl: String = System.getenv("BASE_URL") ?: "https://dou-transit-api.onrender.com"

    // Developer passcode
    const val developerPasscode: String = "DOU_DEV_2026"

    // Fare matrix (Naira)
    const val insideCampusFare: Double = 100.0
    const val goingInsideFare: Double = 300.0
    const val goingOutsideFare: Double = 200.0
}
