```dockerfile
# Use an official OpenJDK runtime as a parent image
FROM openjdk:17-jdk-slim

# Set the working directory in the container
WORKDIR /app

# Copy the packaged Spring Boot application JAR file into the container
# The `target/scrapineer-0.0.1-SNAPSHOT.jar` path assumes you've run `mvn package`
COPY target/scrapineer-0.0.1-SNAPSHOT.jar app.jar

# Expose the port on which the Spring Boot application will run
EXPOSE 8080

# Run the application when the container starts
# The `java -jar` command starts the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]

# Optional: Define build arguments for versioning (if needed)
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar
```