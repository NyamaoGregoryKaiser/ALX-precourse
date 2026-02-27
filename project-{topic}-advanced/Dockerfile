```dockerfile
# Dockerfile for WebScraperX Spring Boot application

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS build

WORKDIR /app

# Copy the Maven wrapper and pom.xml to download dependencies
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (only if pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the source code
COPY src src

# Build the Spring Boot application
RUN ./mvnw package -Dmaven.test.skip=true

# Stage 2: Create the final image
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Set environment variables for database connection (defaults for local docker-compose)
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_NAME=webscraperdb
ENV DB_USERNAME=webscraper
ENV DB_PASSWORD=webscraperpass
ENV JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_256_bits_long_and_should_be_stored_securely_in_prod

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

# Healthcheck for Docker (optional but recommended for production)
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD curl --fail http://localhost:8080/actuator/health || exit 1

```