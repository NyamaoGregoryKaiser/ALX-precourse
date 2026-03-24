# Use a lighter OpenJDK image for Java 17
FROM openjdk:17-jdk-slim as build

# Set working directory
WORKDIR /app

# Copy the Maven wrapper files to enable running mvnw inside the container
COPY mvnw .
COPY .mvn .mvn

# Copy the pom.xml file to download dependencies first
COPY pom.xml .

# Download project dependencies. This step is cached as long as pom.xml doesn't change.
RUN ./mvnw dependency:go-offline -B

# Copy the entire source code
COPY src src

# Build the application
# Skip tests during Docker build if they are run in CI separately to speed up image creation
RUN ./mvnw install -DskipTests

# Use a smaller base image for the final runtime
FROM openjdk:17-jre-slim

# Set working directory
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Run the application
# Pass Spring Boot active profile or other environment variables if needed
ENTRYPOINT ["java", "-jar", "app.jar"]