# Use a JRE-only base image for smaller size
FROM openjdk:17-jre-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the packaged Spring Boot application JAR file
# The JAR file is typically located in `target/` after `mvn clean package`
# Assuming the JAR name is `task-management-backend-0.0.1-SNAPSHOT.jar`
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Expose the port on which the Spring Boot application runs
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

# Example build command from the backend directory:
# docker build -t task-management-backend .

# Example run command:
# docker run -p 8080:8080 -e DB_HOST=host.docker.internal -e DB_NAME=taskmgrdb -e DB_USERNAME=taskmgruser -e DB_PASSWORD=password -e JWT_SECRET=YOUR_VERY_LONG_SECRET_KEY task-management-backend
```