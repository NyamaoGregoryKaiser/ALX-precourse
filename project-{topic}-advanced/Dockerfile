# Use a lighter base image for Java 17
FROM eclipse-temurin:17-jre-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the Flyway migration scripts
COPY src/main/resources/db/migration ./src/main/resources/db/migration

# Copy the built JAR file from the Maven build stage (assuming a multi-stage build or local build)
# For local build: After 'mvn clean package', the JAR will be in 'target/'
# Replace 'alx-scraper-0.0.1-SNAPSHOT.jar' with your actual JAR name if it differs
COPY target/alx-scraper-0.0.1-SNAPSHOT.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Define environment variables with default values.
# These can be overridden when running the Docker container.
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=alx_scraper
ENV DB_USER=alx_user
ENV DB_PASSWORD=alx_password
ENV JWT_SECRET=your_jwt_secret_key_that_is_at_least_256_bit_long_and_very_secure
ENV JWT_EXPIRATION_MS=86400000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV RATE_LIMIT_TIME_WINDOW_SECONDS=60

# Command to run the application
# Use 'java -jar' to execute the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]

# ALX Focus: Dockerization for containerized deployment, ensuring environment
# consistency and ease of deployment. Uses a small base image, clearly defines
# dependencies, exposed ports, and environment variables for external configuration.
```