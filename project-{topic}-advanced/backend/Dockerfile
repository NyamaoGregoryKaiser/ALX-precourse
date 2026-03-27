```Dockerfile
# Dockerfile for Java Spring Boot Backend
FROM eclipse-temurin:17-jdk-focal as builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the application
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-focal
WORKDIR /app
# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar
# Expose the port the Spring Boot app runs on
EXPOSE 8080
# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
```