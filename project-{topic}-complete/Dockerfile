# Use a slim OpenJDK 17 image for a smaller final image size
FROM openjdk:17-jdk-slim AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven wrapper files to enable building inside the container
COPY .mvn .mvn
COPY mvnw pom.xml ./

# Download all project dependencies (only if pom.xml changes)
RUN ./mvnw dependency:go-offline -Dmaven.test.skip=true

# Copy the rest of the application source code
COPY src src

# Build the application
RUN ./mvnw install -DskipTests

# Stage 2: Create the final runtime image
FROM openjdk:17-jdk-slim

# Set the working directory
WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Define environment variables for database (can be overridden via docker-compose or Kubernetes)
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/ecommerce_db
ENV SPRING_DATASOURCE_USERNAME=admin
ENV SPRING_DATASOURCE_PASSWORD=password
ENV APP_JWT_SECRET=YourSuperSecretKeyForJWTGenerationAndValidationThatMustBeAtLeast256BitsLongAndStoredSecurely

# Set an entrypoint to run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**docker-compose.yml**

```yaml