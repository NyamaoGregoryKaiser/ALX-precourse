```dockerfile
# Use a slim OpenJDK base image
FROM openjdk:17-jdk-slim

# Set the working directory
WORKDIR /app

# Copy the Maven wrapper files to enable building inside the container
COPY mvnw .
COPY .mvn .mvn

# Copy the pom.xml file to download dependencies first (leveraging Docker cache)
COPY pom.xml .

# Download dependencies (this step will be cached if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.wagon.http.ssl.ignore.validity.dates=true

# Copy the rest of the application source code
COPY src src

# Build the application
RUN ./mvnw clean install -DskipTests

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "target/vizflow-backend-0.0.1-SNAPSHOT.jar"]
```