```dockerfile
# Use a lighter base image for Java 17
FROM openjdk:17-jdk-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven wrapper files to allow building inside the container if needed
# COPY mvnw .
# COPY .mvn .mvn

# Copy the pom.xml file to leverage Docker layer caching
COPY pom.xml .

# Download dependencies to cache them (optional, if you build outside container)
# RUN ./mvnw dependency:go-offline -B

# Copy the entire source code
COPY src src

# Build the application
# Use -DskipTests for faster build, or remove to run tests during build
# RUN ./mvnw clean install -DskipTests

# If building outside the container, copy the JAR directly
# To build outside: `mvn clean install -DskipTests`
# Then run `docker build -t chat-app .`
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Expose the port the application runs on
EXPOSE 8080

# Define environment variables for database connection (default to local settings)
# These can be overridden via docker-compose or `docker run -e`
ENV DB_HOST=localhost \
    DB_PORT=5432 \
    DB_NAME=chatdb \
    DB_USERNAME=chatuser \
    DB_PASSWORD=chatpass \
    JWT_SECRET=supersecretjwtkeythatisatleast256bitlongforsecuritypurposes

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

```