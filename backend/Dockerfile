# ============================================================
# DOU Transit Backend API Server - Multi-stage Docker Build
# ============================================================
# Stage 1: Build with Gradle + JDK 21
# ============================================================
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Install dependencies needed for Gradle
RUN apk add --no-cache bash

# Copy Gradle wrapper first (for layer caching)
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle.kts .
COPY settings.gradle.kts ./

# Make gradlew executable
RUN chmod +x gradlew

# Download dependencies (cached layer - only runs when dependencies change)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY src/ src/

# Build the fat JAR using the shadow plugin
RUN ./gradlew shadowJar --no-daemon -x test

# ============================================================
# Stage 2: Runtime with minimal JRE
# ============================================================
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the built fat JAR from builder stage
COPY --from=builder /app/build/libs/*-all.jar app.jar

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the API port (Render sets PORT env var or defaults to 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/api/health || exit 1

# Run the application
CMD ["sh", "-c", "java -jar app.jar"]
