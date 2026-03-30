```dockerfile
# Stage 1: Build the application using Maven and Java 17
FROM maven:3.9.6-amazoncorretto-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the JAR file, skipping tests for production build
RUN mvn clean package -DskipTests

# Stage 2: Create the final lean image
FROM amazoncorretto:17-alpine-jdk
WORKDIR /app
# Copy the JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar
# Expose the port the Spring Boot application runs on
EXPOSE 8080
# Run the JAR file when the container starts
ENTRYPOINT ["java", "-jar", "app.jar"]
```