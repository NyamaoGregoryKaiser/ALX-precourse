```dockerfile
# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS builder

# Set the working directory
WORKDIR /app

# Copy the Maven wrapper and project files
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline

# Copy the rest of the application source code
COPY src ./src

# Build the Spring Boot application
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the final image
FROM eclipse-temurin:17-jre-jammy

# Set the working directory
WORKDIR /app

# Copy the built JAR file from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Set environment variables for the database (can be overridden by docker-compose or Kubernetes)
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=ml_utilities_db
ENV DB_USER=ml_user
ENV DB_PASSWORD=ml_password
ENV JWT_SECRET=supersecretjwtkeyforalxprojectdevelopmentonlyandnotforproductionuse

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```