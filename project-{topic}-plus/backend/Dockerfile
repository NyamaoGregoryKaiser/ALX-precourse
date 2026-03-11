# Use a slimmed-down OpenJDK image for better security and smaller size
FROM eclipse-temurin:17-jdk-focal as build

WORKDIR /app

# Copy the Maven wrapper and pom.xml to leverage Docker cache for dependencies
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn

# Download project dependencies
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline

# Copy the entire source code
COPY src src

# Build the application
RUN ./mvnw clean install -DskipTests

# Stage 2: Create the runtime image
FROM eclipse-temurin:17-jre-focal

WORKDIR /app

# Copy only the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### `frontend/package.json` (Conceptual React Frontend)
```json