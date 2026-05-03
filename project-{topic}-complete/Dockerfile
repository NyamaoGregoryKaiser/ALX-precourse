# Use a slimmed-down OpenJDK image for Java 17
FROM openjdk:17-jdk-slim AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven project files
COPY pom.xml .
COPY src ./src

# Build the application using Maven
# The --no-transfer-progress flag hides the download progress bars
# The -Dmaven.test.skip=true flag skips tests during the build stage for faster image creation
RUN --mount=type=cache,target=/root/.m2 ./mvnw clean package -Dmaven.test.skip=true

# --- Second Stage: Create a smaller runtime image ---
FROM openjdk:17-jre-slim

# Set the working directory
WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Define the command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```