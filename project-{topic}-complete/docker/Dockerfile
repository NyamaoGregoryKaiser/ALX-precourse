# Use a JRE-only base image for smaller size in production
FROM eclipse-temurin:17-jre-focal

# Set the working directory in the container
WORKDIR /app

# Copy the JAR file from the Maven build (assuming 'mvn package' has been run)
# The JAR name might vary based on your pom.xml artifactId and version.
# Adjust 'ml_utilities_system-0.0.1-SNAPSHOT.jar' if yours is different.
COPY backend/target/ml_utilities_system-0.0.1-SNAPSHOT.jar app.jar

# Copy dataset and temp directories if they contain seed data or are pre-created
# Ensure these directories exist or are created by the application if empty initially
# The application itself will create these if they don't exist, so this is mostly for pre-seeding
RUN mkdir -p /app/data/datasets /app/data/temp /app/logs
VOLUME /app/data/datasets
VOLUME /app/data/temp
VOLUME /app/logs

# Expose the port the application runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

# For Spring Boot, you can also pass profiles/configs:
# ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
# ENTRYPOINT ["java", "-jar", "app.jar", "--spring.config.location=/app/config/application.properties"]
```