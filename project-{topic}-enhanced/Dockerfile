```dockerfile
# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

COPY pom.xml .
COPY src ./src

# Build the application with Maven
# Use -DskipTests to skip tests during build for faster image creation,
# but ensure tests are run in CI pipeline.
RUN mvn clean install -DskipTests

# Stage 2: Create the final runtime image
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

# Health check (optional but recommended for production readiness)
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD curl --fail http://localhost:8080/actuator/health || exit 1
```