```dockerfile
# Use a slimmed-down OpenJDK 17 base image
FROM eclipse-temurin:17-jre-focal

# Set working directory inside the container
WORKDIR /app

# Copy the built JAR file from the Maven build stage (assuming it's named target/cms-system-*.jar)
# Replace `cms-system-0.0.1-SNAPSHOT.jar` with your actual artifact name if different.
COPY target/*.jar app.jar

# Expose the port your Spring Boot application runs on
EXPOSE 8080

# Run the Spring Boot application
# Use environment variables for sensitive data like DB credentials
ENTRYPOINT ["java", "-jar", "app.jar"]
```