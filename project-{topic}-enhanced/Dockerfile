```dockerfile
# Use a JRE base image for smaller size
FROM openjdk:17-jre-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the built JAR file into the container
# The JAR is usually found in target/ after a 'mvn package' command
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Expose the port your Spring Boot application runs on
EXPOSE 8080

# Run the Spring Boot application
# Use -Dspring.profiles.active=prod to activate production profile
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
```