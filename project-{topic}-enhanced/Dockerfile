# Use a slimmed down OpenJDK 17 image for smaller size
FROM openjdk:17-jdk-slim AS build

# Set working directory
WORKDIR /app

# Copy the Maven wrapper files and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Copy project source
COPY src src

# Build the application
# Use -DskipTests to skip tests during the build, which are usually run in CI
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean package -DskipTests

# --- Second stage: Runtime image ---
FROM openjdk:17-jdk-slim

# Set working directory
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Run the application
# Use environment variables for DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET, JWT_EXPIRATION_MS
ENTRYPOINT ["java", "-jar", "app.jar"]