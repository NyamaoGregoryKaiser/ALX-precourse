```dockerfile
# Use a multi-stage build to optimize image size

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-focal as builder

WORKDIR /app

# Copy the Maven wrapper files to enable caching of dependencies
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Download dependencies to cache them. This step is skipped if pom.xml hasn't changed.
RUN ./mvnw dependency:go-offline -Dmaven.test.skip=true

# Copy the source code
COPY src ./src

# Build the JAR file
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the final image
FROM eclipse-temurin:17-jre-focal

WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```