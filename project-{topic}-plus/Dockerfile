```dockerfile
# Use a lighter base image for Spring Boot applications
FROM openjdk:17-jdk-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven wrapper files to enable building inside the container
COPY .mvn .mvn
COPY mvnw pom.xml ./

# Build the application - this step can be optimized with multi-stage builds
# to avoid including build tools in the final image.
# For simplicity, we keep it in one stage for this example.
RUN apt-get update && apt-get install -y maven \
    && ./mvnw dependency:go-offline -B \
    && rm -rf /root/.m2/repository

# Copy the source code
COPY src src

# Package the application into a JAR file
RUN ./mvnw clean install -DskipTests

# Define the argument for the JAR file path
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Run the JAR file
ENTRYPOINT ["java", "-jar", "app.jar"]
```