```dockerfile
# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app

# Copy Maven wrapper files and pom.xml
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Download dependencies (skip tests for faster build cache)
# This step will be cached if pom.xml doesn't change
RUN ./mvnw dependency:go-offline -B

# Copy the rest of the source code
COPY src ./src

# Build the application
RUN ./mvnw package -DskipTests

# Stage 2: Create the final Docker image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Set timezone (optional, but good for consistent logging)
ENV TZ=Africa/Cairo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Define environment variables for database connection (default to local if not provided)
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=product_db
ENV DB_USER=admin
ENV DB_PASSWORD=adminpass
ENV JWT_SECRET=supersecretkeythatisatleast256bitlongforproductionuse1234567890

# Entrypoint to run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
```