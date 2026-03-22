# Use a slim Java 17 image as the base for building
FROM eclipse-temurin:17-jdk-jammy as builder

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven pom.xml and source code
# We copy pom.xml separately to leverage Docker's build cache.
# If pom.xml doesn't change, Maven dependencies don't need to be re-downloaded.
COPY pom.xml .
COPY src ./src

# Package the application using Maven
# -Dmaven.test.skip=true skips running tests during the build
# --no-transfer-progress reduces verbose output during dependency downloads
# This step creates an executable JAR file in target/
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean install -DskipTests

# Use a lighter JRE image for the final runtime image
FROM eclipse-temurin:17-jre-jammy

# Set the working directory for the runtime
WORKDIR /app

# Copy the executable JAR from the builder stage
# The JAR is typically named artifactId-version.jar, you might need to adjust this.
COPY --from=builder /app/target/*.jar app.jar

# Expose the port the Spring Boot application listens on
EXPOSE 8080

# Define environment variables (can be overridden at runtime)
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_TOOL_OPTIONS="-XX:+ExitOnOutOfMemoryError" # Exit JVM on OOM

# Run the application
# Use entrypoint for container initialization, ensures script runs as PID 1
ENTRYPOINT ["java", "-jar", "app.jar"]