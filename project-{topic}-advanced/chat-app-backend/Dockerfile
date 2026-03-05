```dockerfile
# Stage 1: Build the Spring Boot application
FROM maven:3.9.5-amazoncorretto-17 AS build

WORKDIR /app

# Copy the pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the rest of the source code
COPY src ./src

# Build the application
RUN mvn clean install -DskipTests

# Stage 2: Create the final image
FROM amazoncorretto:17-alpine-jdk

WORKDIR /app

# Set timezone (optional, but good practice)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    echo "Etc/UTC" > /etc/timezone

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the application port
EXPOSE 8080

# Define entrypoint to run the JAR
ENTRYPOINT ["java", "-jar", "app.jar"]
```