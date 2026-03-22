```dockerfile
# Use a slim OpenJDK 17 base image for smaller footprint
FROM openjdk:17-jdk-slim as builder

# Set the working directory
WORKDIR /app

# Copy the Maven pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application
# Use -Dmaven.test.skip=true to skip tests during the build in the Dockerfile
# For production builds, you might want to run tests in CI/CD before building the image.
RUN --mount=type=cache,target=/root/.m2 ./mvnw package -DskipTests

# Stage 2: Create the final image
FROM openjdk:17-jdk-slim

# Set the working directory
WORKDIR /app

# Copy the built JAR file from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Define the entrypoint command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```