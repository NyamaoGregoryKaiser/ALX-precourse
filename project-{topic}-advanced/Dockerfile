# Use a slimmed-down OpenJDK 17 as the base image
FROM openjdk:17-jdk-slim as builder

# Set working directory inside the container
WORKDIR /app

# Copy the Maven build files (pom.xml) to download dependencies
COPY pom.xml .

# Copy the source code
COPY src ./src

# Build the application using Maven
# The `mvn dependency:go-offline` command helps pre-download dependencies
# The `mvn clean install -DskipTests` command builds the JAR without running tests
# Using `-DskipTests` here because tests will be run in the CI pipeline.
RUN mvn clean install -DskipTests

# Stage 2: Create a smaller runtime image
FROM openjdk:17-jre-slim

# Set working directory
WORKDIR /app

# Copy the built JAR file from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Set environment variables for database connection (default values for local dev)
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=taskmanager
ENV DB_USERNAME=user
ENV DB_PASSWORD=password
ENV JWT_SECRET=superSecretKeyForALXProjectThatIsLongAndSecureEnoughToBeProductionReady

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]