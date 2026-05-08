```dockerfile
# Stage 1: Build the Spring Boot application
FROM eclipse-temurin:17-jdk-alpine as builder

# Set working directory
WORKDIR /app

# Copy Maven pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the rest of the application source code
COPY src ./src

# Build the application
RUN mvn clean install -DskipTests

# Stage 2: Create the final Docker image
FROM eclipse-temurin:17-jre-alpine

# Set working directory
WORKDIR /app

# Copy the built JAR file from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```