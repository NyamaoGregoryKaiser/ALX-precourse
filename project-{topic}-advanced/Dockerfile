# Use a slim Java 17 image for a smaller footprint
FROM eclipse-temurin:17-jdk-jammy as builder

# Set working directory
WORKDIR /app

# Copy the Maven build files and download dependencies
COPY pom.xml .
COPY src ./src
RUN mvn dependency:go-offline -B

# Build the application
RUN mvn clean install -DskipTests

# Stage 2: Create the final image
FROM eclipse-temurin:17-jre-jammy

# Set working directory
WORKDIR /app

# Copy only the built JAR from the builder stage
COPY --from=builder /app/target/*.jar appinsight.jar

# Expose the port the Spring Boot application runs on
EXPOSE 8080

# Set environment variables for database connection (defaults will be used if not provided by docker-compose)
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=appinsight_db
ENV DB_USER=appinsight_user
ENV DB_PASSWORD=password
ENV JWT_SECRET=verySecretKeyForAppInsightMonitoringSystemThatIsLongAndSecureForProductionUse

# Run the application
ENTRYPOINT ["java", "-jar", "appinsight.jar"]