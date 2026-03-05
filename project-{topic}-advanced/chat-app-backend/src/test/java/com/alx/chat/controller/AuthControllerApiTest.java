```java
package com.alx.chat.controller;

import com.alx.chat.ChatApplication;
import com.alx.chat.dto.auth.AuthenticationRequest;
import com.alx.chat.dto.auth.AuthenticationResponse;
import com.alx.chat.dto.auth.RegisterRequest;
import com.alx.chat.repository.UserRepository;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = ChatApplication.class)
@Testcontainers
@DisplayName("Auth Controller API Tests")
class AuthControllerApiTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> false);
    }

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        userRepository.deleteAll(); // Clean up before each test
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteAll();
    }

    @Test
    void registerUser_Success() {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("testuser")
                .email("test@example.com")
                .password("password123")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .when()
                .post("/api/v1/auth/register")
                .then()
                .statusCode(200)
                .body("token", notNullValue());
    }

    @Test
    void registerUser_UsernameAlreadyExists_Failure() {
        // Register once
        registerUser_Success();

        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("testuser") // Same username
                .email("another@example.com")
                .password("password123")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .when()
                .post("/api/v1/auth/register")
                .then()
                .statusCode(409); // Conflict
    }

    @Test
    void authenticateUser_Success() {
        // First register a user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("authuser")
                .email("auth@example.com")
                .password("authpass")
                .build();
        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .post("/api/v1/auth/register")
                .then()
                .statusCode(200);

        AuthenticationRequest authRequest = AuthenticationRequest.builder()
                .username("authuser")
                .password("authpass")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .when()
                .post("/api/v1/auth/authenticate")
                .then()
                .statusCode(200)
                .body("token", notNullValue());
    }

    @Test
    void authenticateUser_InvalidCredentials_Failure() {
        AuthenticationRequest authRequest = AuthenticationRequest.builder()
                .username("nonexistent")
                .password("wrongpassword")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .when()
                .post("/api/v1/auth/authenticate")
                .then()
                .statusCode(401); // Unauthorized
    }

    // Helper method to get a valid JWT token
    public static String getAuthToken(String username, String password, int port) {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username(username)
                .email(username + "@example.com")
                .password(password)
                .build();
        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .post("http://localhost:" + port + "/api/v1/auth/register")
                .then()
                .statusCode(200);

        AuthenticationRequest authRequest = AuthenticationRequest.builder()
                .username(username)
                .password(password)
                .build();
        return given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .post("http://localhost:" + port + "/api/v1/auth/authenticate")
                .then()
                .statusCode(200)
                .extract().as(AuthenticationResponse.class)
                .getToken();
    }
}
```