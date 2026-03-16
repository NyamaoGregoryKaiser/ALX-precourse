```java
package com.alx.scrapineer.integration;

import com.alx.scrapineer.ScrapineerApplication;
import com.alx.scrapineer.api.dto.auth.AuthRequest;
import com.alx.scrapineer.api.dto.auth.AuthResponse;
import com.alx.scrapineer.api.dto.auth.RegisterRequest;
import com.alx.scrapineer.api.dto.scraping.CssSelectorDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingJobDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetDto;
import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.SelectorType;
import com.alx.scrapineer.data.repository.UserRepository;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Set;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for the Scrapineer application using Testcontainers for PostgreSQL.
 * This covers authentication, target management, and job management end-to-end.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = ScrapineerApplication.class)
@ActiveProfiles("test")
class ScrapineerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository; // To verify user existence if needed

    // Start PostgreSQL container
    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    // Dynamic properties to connect Spring Boot to the Testcontainers PostgreSQL
    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.flyway.enabled", () -> "true"); // Ensure Flyway runs on test DB
        registry.add("spring.flyway.locations", () -> "classpath:/config/flyway");
        registry.add("jwt.secret", () -> "very_secret_key_for_testing_purposes_only_12345");
    }

    private String adminToken;
    private String userToken;

    @BeforeAll
    static void setup() {
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }

    @BeforeEach
    void setUpEach() {
        RestAssured.port = port;
        userRepository.deleteAll(); // Clean up users before each test to ensure fresh registration

        // Register and authenticate Admin
        RegisterRequest adminRegister = RegisterRequest.builder()
                .username("admin_test")
                .password("adminpass")
                .roles(Set.of(Role.ADMIN, Role.USER))
                .build();

        AuthResponse adminAuthResponse = given()
                .contentType(ContentType.JSON)
                .body(adminRegister)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract().as(AuthResponse.class);
        adminToken = adminAuthResponse.getToken();

        // Register and authenticate regular User
        RegisterRequest userRegister = RegisterRequest.builder()
                .username("user_test")
                .password("userpass")
                .roles(Set.of(Role.USER))
                .build();

        AuthResponse userAuthResponse = given()
                .contentType(ContentType.JSON)
                .body(userRegister)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract().as(AuthResponse.class);
        userToken = userAuthResponse.getToken();
    }

    @Test
    void testUserRegistrationAndLogin() {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("newuser")
                .password("password123")
                .roles(Set.of(Role.USER))
                .build();

        // Register
        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .body("username", equalTo("newuser"))
                .body("token", notNullValue());

        // Login with new user
        AuthRequest authRequest = AuthRequest.builder()
                .username("newuser")
                .password("password123")
                .build();

        given()
                .contentType(ContentType.JSON)
                .body(authRequest)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("username", equalTo("newuser"))
                .body("token", notNullValue());
    }

    @Test
    void testCreateScrapingTarget_AdminUser_Success() {
        CssSelectorDto selector1 = CssSelectorDto.builder()
                .name("page_title")
                .selectorValue("h1")
                .type(SelectorType.TEXT)
                .build();
        ScrapingTargetDto newTarget = ScrapingTargetDto.builder()
                .name("Integration Test Target 1")
                .url("https://www.alxafrica.com/")
                .description("Test target for integration tests")
                .active(true)
                .selectors(List.of(selector1))
                .build();

        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(newTarget)
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .body("name", equalTo("Integration Test Target 1"))
                .body("selectors[0].name", equalTo("page_title"));
    }

    @Test
    void testCreateScrapingTarget_RegularUser_Success() {
        CssSelectorDto selector1 = CssSelectorDto.builder()
                .name("first_paragraph")
                .selectorValue("p.intro")
                .type(SelectorType.TEXT)
                .build();
        ScrapingTargetDto newTarget = ScrapingTargetDto.builder()
                .name("User Test Target")
                .url("https://example.com/")
                .description("Another test target")
                .active(true)
                .selectors(List.of(selector1))
                .build();

        given()
                .header("Authorization", "Bearer " + userToken)
                .contentType(ContentType.JSON)
                .body(newTarget)
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .body("name", equalTo("User Test Target"));
    }

    @Test
    void testGetScrapingTargetById_Success() {
        // First, create a target
        CssSelectorDto selector = CssSelectorDto.builder().name("h1").selectorValue("h1").type(SelectorType.TEXT).build();
        ScrapingTargetDto createdTarget = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingTargetDto.builder().name("Get Test Target").url("http://get.com").active(true).selectors(List.of(selector)).build())
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .extract().as(ScrapingTargetDto.class);

        // Then, retrieve it
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/targets/{id}", createdTarget.getId())
                .then()
                .statusCode(200)
                .body("id", equalTo(createdTarget.getId().intValue()))
                .body("name", equalTo("Get Test Target"));
    }

    @Test
    void testGetScrapingTargetById_NotFound() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/targets/{id}", 99999L) // Non-existent ID
                .then()
                .statusCode(404)
                .body("message", containsString("Scraping target not found"));
    }

    @Test
    void testUpdateScrapingTarget_Success() {
        // Create target first
        CssSelectorDto selector = CssSelectorDto.builder().name("h1").selectorValue("h1").type(SelectorType.TEXT).build();
        ScrapingTargetDto createdTarget = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingTargetDto.builder().name("Update Test Target").url("http://update.com").active(true).selectors(List.of(selector)).build())
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .extract().as(ScrapingTargetDto.class);

        // Update target
        createdTarget.setName("Updated Target Name");
        createdTarget.setActive(false);
        createdTarget.getSelectors().get(0).setName("updated_h1_selector");

        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(createdTarget)
                .when()
                .put("/api/targets/{id}", createdTarget.getId())
                .then()
                .statusCode(200)
                .body("name", equalTo("Updated Target Name"))
                .body("active", equalTo(false))
                .body("selectors[0].name", equalTo("updated_h1_selector"));
    }

    @Test
    void testDeleteScrapingTarget_Success() {
        // Create target first
        CssSelectorDto selector = CssSelectorDto.builder().name("h1").selectorValue("h1").type(SelectorType.TEXT).build();
        ScrapingTargetDto createdTarget = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingTargetDto.builder().name("Delete Test Target").url("http://delete.com").active(true).selectors(List.of(selector)).build())
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .extract().as(ScrapingTargetDto.class);

        // Delete target
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .delete("/api/targets/{id}", createdTarget.getId())
                .then()
                .statusCode(204);

        // Verify it's deleted
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/targets/{id}", createdTarget.getId())
                .then()
                .statusCode(404);
    }

    @Test
    void testCreateScrapingJob_Manual_Success() {
        // Create a target first
        CssSelectorDto selector = CssSelectorDto.builder().name("h1").selectorValue("h1").type(SelectorType.TEXT).build();
        ScrapingTargetDto createdTarget = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingTargetDto.builder().name("Job Test Target").url("https://www.alxafrica.com/").active(true).selectors(List.of(selector)).build())
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .extract().as(ScrapingTargetDto.class);

        ScrapingJobDto newJob = ScrapingJobDto.builder()
                .targetId(createdTarget.getId())
                .scheduleCron(null) // Manual job
                .status(JobStatus.CREATED)
                .build();

        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(newJob)
                .when()
                .post("/api/jobs")
                .then()
                .statusCode(201)
                .body("targetId", equalTo(createdTarget.getId().intValue()))
                .body("status", equalTo("CREATED"))
                .body("scheduleCron", nullValue());
    }

    @Test
    void testStartScrapingJob_Manual_Success() throws InterruptedException {
        // Create a target
        CssSelectorDto selector = CssSelectorDto.builder().name("h1").selectorValue("h1").type(SelectorType.TEXT).build();
        ScrapingTargetDto createdTarget = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingTargetDto.builder().name("Start Test Target").url("https://www.alxafrica.com/").active(true).selectors(List.of(selector)).build())
                .when()
                .post("/api/targets")
                .then()
                .statusCode(201)
                .extract().as(ScrapingTargetDto.class);

        // Create a manual job
        ScrapingJobDto createdJob = given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(ScrapingJobDto.builder().targetId(createdTarget.getId()).status(JobStatus.CREATED).build())
                .when()
                .post("/api/jobs")
                .then()
                .statusCode(201)
                .extract().as(ScrapingJobDto.class);

        // Start the job
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .post("/api/jobs/{id}/start", createdJob.getId())
                .then()
                .statusCode(200)
                .body("id", equalTo(createdJob.getId().intValue()));

        // Due to async nature of scraping, we might need a small delay to see status change to COMPLETED/FAILED
        Thread.sleep(2000); // Wait for async scraping to potentially finish

        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/jobs/{id}", createdJob.getId())
                .then()
                .statusCode(200)
                .body("status", anyOf(equalTo("COMPLETED"), equalTo("FAILED"))) // Depending on external URL, it might fail
                .body("lastRunAt", notNullValue());
    }
}
```