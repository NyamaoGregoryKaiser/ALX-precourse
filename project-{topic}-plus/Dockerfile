```dockerfile
# Stage 1: Build the Spring Boot application
FROM eclipse-temurin:17-jdk-jammy AS build

WORKDIR /app

# Copy the Maven wrapper and pom.xml to download dependencies
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (if they haven't changed, this layer will be cached)
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the source code
COPY src src

# Build the JAR file
RUN ./mvnw package -DskipTests

# Stage 2: Create the final Docker image
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Copy the JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port on which the Spring Boot application runs
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
```