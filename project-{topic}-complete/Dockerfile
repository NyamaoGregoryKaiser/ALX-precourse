```dockerfile
# Use a multi-stage build to create a small final image

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy the Maven wrapper and pom.xml to download dependencies
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline

# Copy the rest of the source code
COPY src ./src

# Build the JAR file
RUN ./mvnw package -DskipTests

# Stage 2: Create the final runtime image
FROM eclipse-temurin:17-jre-jammy AS final
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Create the uploads directory for datasets
RUN mkdir -p /app/uploads

# Set the entry point to run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]

# Add healthcheck (optional but recommended for production)
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD curl --fail http://localhost:8080/actuator/health || exit 1
```