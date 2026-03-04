# Stage 1: Build the Spring Boot application
FROM maven:3.9.6-amazoncorretto-17 AS build
LABEL authors="ALX Software Engineering"
LABEL maintainer="ALX Developers <dev@alxafrica.com>"
LABEL project="Secure Auth System"

# Set the working directory inside the container
WORKDIR /app

# Copy the pom.xml file first to cache dependencies
COPY pom.xml .

# Download dependencies - only if pom.xml changes
RUN mvn dependency:go-offline

# Copy the rest of the application source code
COPY src ./src

# Package the application into a JAR file
RUN mvn clean install -DskipTests

# Stage 2: Create the final Docker image
FROM amazoncorretto:17-alpine-jdk
LABEL authors="ALX Software Engineering"
LABEL maintainer="ALX Developers <dev@alxafrica.com>"
LABEL project="Secure Auth System"

# Set the working directory
WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Define environment variables with default values
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=auth_db
ENV DB_USERNAME=admin
ENV DB_PASSWORD=password
ENV JWT_SECRET_KEY=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### `.github/workflows/ci-cd.yml`

```yaml