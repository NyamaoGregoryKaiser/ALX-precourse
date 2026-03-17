```dockerfile
# Use a slim OpenJDK 17 base image for smaller size
FROM openjdk:17-jdk-slim as builder

# Set working directory inside the container
WORKDIR /app

# Copy the Maven wrapper files and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (to leverage Docker layer caching)
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the application source code
COPY src src

# Build the application
RUN ./mvnw install -DskipTests

# Package the application as a runnable JAR
FROM openjdk:17-jdk-slim

# Set volume for logs and configuration
VOLUME /tmp
ARG JAR_FILE=/app/target/*.jar

# Copy the built JAR from the builder stage
COPY --from=builder ${JAR_FILE} app.jar

# Expose the port the application runs on
EXPOSE 8080

# Environment variables for production (can be overridden by docker-compose or Kubernetes)
ENV SPRING_PROFILES_ACTIVE=prod
ENV DB_URL=jdbc:postgresql://postgres:5432/alx_mobile_db_prod
ENV DB_USERNAME=alxuser_prod
ENV DB_PASSWORD=alxpassword_prod

# Command to run the application
ENTRYPOINT ["java","-Djava.security.egd=file:/dev/urandom","-jar","/app.jar"]
```