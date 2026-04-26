package com.alx.scraper.controller;

import com.alx.scraper.AlxScraperApplication;
import com.alx.scraper.dto.JwtResponse;
import com.alx.scraper.dto.LoginRequest;
import com.alx.scraper.dto.ScrapingJobCreateRequest;
import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.model.User;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import com.alx.scraper.security.JwtUtil;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * API Integration Tests for {@link ScrapingJobController}.
 * Uses Spring Boot's test capabilities along with Testcontainers for a real PostgreSQL database
 * and RestAssured for making HTTP requests to the running application.
 *
 * ALX Focus: Demonstrates end-to-end testing for API endpoints, including
 * authentication, data persistence, and authorization checks. Testcontainers
 * ensures a realistic database environment for each test run.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = AlxScraperApplication.class)
@Testcontainers // Enables Testcontainers for JUnit 5
@ActiveProfiles("test") // Use a test profile for specific test configurations
@DisplayName("ScrapingJobController API Integration Tests")
class ScrapingJobControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ScrapingJobRepository scrapingJobRepository;
    @Autowired
    private ScrapedDataRepository scrapedDataRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil; // For generating tokens for tests

    private String jwtToken;
    private User testUser;
    private ScrapingJob existingJob;

    // Testcontainers PostgreSQL setup
    @Container
    public static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    // Dynamic property source to configure Spring Boot to use Testcontainers DB
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true"); // Ensure Flyway runs on test DB
    }

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        // Clear data before each test
        scrapedDataRepository.deleteAll();
        scrapingJobRepository.deleteAll();
        userRepository.deleteAll();

        // Create a test user for authentication
        testUser = new User();
        testUser.setUsername("inttestuser");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.addRole("ROLE_USER");
        userRepository.save(testUser);

        // Authenticate and get JWT token
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("inttestuser");
        loginRequest.setPassword("password123");

        JwtResponse response = given()
                .contentType(ContentType.JSON)
                .body(loginRequest)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .as(JwtResponse.class);
        jwtToken = response.getToken();

        // Create an existing job for tests
        existingJob = new ScrapingJob();
        existingJob.setUser(testUser);
        existingJob.setName("Existing Test Job");
        existingJob.setTargetUrl("http://test.com");
        existingJob.setCssSelector("div");
        existingJob.setStatus(ScrapingJob.JobStatus.ACTIVE);
        existingJob.setScheduleCron("0 0 * * * *");
        scrapingJobRepository.save(existingJob);
    }

    @Test
    @DisplayName("Should create a new scraping job successfully")
    void whenCreateJob_thenReturnsCreatedJob() {
        ScrapingJobCreateRequest request = new ScrapingJobCreateRequest();
        request.setName("My New Job");
        request.setTargetUrl("http://newsite.com");
        request.setCssSelector("p.content");
        request.setScheduleCron("0 30 * * * *");

        given()
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/jobs")
                .then()
                .statusCode(201)
                .body("name", equalTo("My New Job"))
                .body("targetUrl", equalTo("http://newsite.com"))
                .body("cssSelector", equalTo("p.content"))
                .body("status", equalTo(ScrapingJob.JobStatus.ACTIVE.name()))
                .body("userId", equalTo(testUser.getId().intValue()));

        // Verify in DB
        Optional<ScrapingJob> createdJob = scrapingJobRepository.findByName("My New Job");
        assertTrue(createdJob.isPresent());
        assertThat(createdJob.get().getUser().getId()).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("Should return 400 Bad Request for invalid job creation request")
    void whenCreateJob_withInvalidRequest_thenReturnsBadRequest() {
        ScrapingJobCreateRequest request = new ScrapingJobCreateRequest();
        request.setName(""); // Invalid name
        request.setTargetUrl("invalid-url"); // Invalid URL
        request.setCssSelector(""); // Invalid selector

        given()
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .post("/api/jobs")
                .then()
                .statusCode(400)
                .body("errors.name", notNullValue())
                .body("errors.targetUrl", notNullValue())
                .body("errors.cssSelector", notNullValue());
    }

    @Test
    @DisplayName("Should get all jobs for authenticated user")
    void whenGetAllJobs_thenReturnsListOfJobs() {
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .get("/api/jobs")
                .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1))) // At least the existingJob
                .body("name", hasItem(existingJob.getName()));
    }

    @Test
    @DisplayName("Should get a specific job by ID for authenticated user")
    void whenGetJobById_thenReturnsJob() {
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .get("/api/jobs/{jobId}", existingJob.getId())
                .then()
                .statusCode(200)
                .body("id", equalTo(existingJob.getId().intValue()))
                .body("name", equalTo(existingJob.getName()))
                .body("targetUrl", equalTo(existingJob.getTargetUrl()));
    }

    @Test
    @DisplayName("Should return 404 Not Found for non-existent job ID")
    void whenGetJobById_withNonExistentId_thenReturnsNotFound() {
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .get("/api/jobs/{jobId}", 9999L)
                .then()
                .statusCode(404)
                .body("message", containsString("Scraping job not found"));
    }

    @Test
    @DisplayName("Should update an existing job successfully")
    void whenUpdateJob_thenReturnsUpdatedJob() {
        ScrapingJobCreateRequest request = new ScrapingJobCreateRequest();
        request.setName("Updated Job Name");
        request.setTargetUrl("http://updated.com");
        request.setCssSelector("h2.updated");
        request.setScheduleCron("0 0 1 * * *"); // New schedule

        given()
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(ContentType.JSON)
                .body(request)
                .when()
                .put("/api/jobs/{jobId}", existingJob.getId())
                .then()
                .statusCode(200)
                .body("name", equalTo("Updated Job Name"))
                .body("targetUrl", equalTo("http://updated.com"))
                .body("cssSelector", equalTo("h2.updated"))
                .body("scheduleCron", equalTo("0 0 1 * * *"));

        // Verify in DB
        Optional<ScrapingJob> updatedJob = scrapingJobRepository.findById(existingJob.getId());
        assertTrue(updatedJob.isPresent());
        assertThat(updatedJob.get().getName()).isEqualTo("Updated Job Name");
    }

    @Test
    @DisplayName("Should delete an existing job successfully")
    void whenDeleteJob_thenJobIsRemoved() {
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .delete("/api/jobs/{jobId}", existingJob.getId())
                .then()
                .statusCode(204); // No Content

        // Verify in DB
        Optional<ScrapingJob> deletedJob = scrapingJobRepository.findById(existingJob.getId());
        assertFalse(deletedJob.isPresent());
    }

    @Test
    @DisplayName("Should return 404 Not Found when deleting non-existent job")
    void whenDeleteJob_withNonExistentId_thenReturnsNotFound() {
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .delete("/api/jobs/{jobId}", 9999L)
                .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized if no JWT token is provided")
    void whenAccessingEndpoint_withoutJwtToken_thenReturnsUnauthorized() {
        given()
                .contentType(ContentType.JSON)
                .when()
                .get("/api/jobs")
                .then()
                .statusCode(401); // Unauthorized
    }

    @Test
    @DisplayName("Should return 401 Unauthorized if invalid JWT token is provided")
    void whenAccessingEndpoint_withInvalidJwtToken_thenReturnsUnauthorized() {
        given()
                .header("Authorization", "Bearer " + "invalid.token.here")
                .contentType(ContentType.JSON)
                .when()
                .get("/api/jobs")
                .then()
                .statusCode(401); // Unauthorized
    }

    @Test
    @DisplayName("Should return 403 Forbidden when accessing another user's job")
    void whenAccessingAnotherUsersJob_thenReturnsForbidden() {
        // Create another user
        User otherUser = new User();
        otherUser.setUsername("otheruser");
        otherUser.setPassword(passwordEncoder.encode("otherpass"));
        otherUser.addRole("ROLE_USER");
        userRepository.save(otherUser);

        // Create a job for the other user
        ScrapingJob otherUserJob = new ScrapingJob();
        otherUserJob.setUser(otherUser);
        otherUserJob.setName("Other User's Job");
        otherUserJob.setTargetUrl("http://other.com");
        otherUserJob.setCssSelector("body");
        otherUserJob.setStatus(ScrapingJob.JobStatus.ACTIVE);
        scrapingJobRepository.save(otherUserJob);

        // Try to access otherUserJob with testUser's token
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .get("/api/jobs/{jobId}", otherUserJob.getId())
                .then()
                .statusCode(404) // Service layer throws 404 if not found for *this* user
                .body("message", containsString("Scraping job not found"));
    }

    @Test
    @DisplayName("Should trigger a scraping job successfully")
    void whenTriggerJob_thenJobStatusIsUpdated() throws InterruptedException {
        // Mock a simple external call, but the scraping service is mocked in unit tests
        // Here, we just check the status change and lastRunAt
        LocalDateTime beforeTrigger = LocalDateTime.now();

        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .post("/api/jobs/{jobId}/trigger", existingJob.getId())
                .then()
                .statusCode(200)
                .body("id", equalTo(existingJob.getId().intValue()))
                .body("status", anyOf(equalTo(ScrapingJob.JobStatus.COMPLETED.name()), equalTo(ScrapingJob.JobStatus.RUNNING.name()))) // Can be running or completed quickly
                .body("lastRunAt", notNullValue());

        // Give a moment for async execution if any, then verify in DB
        Thread.sleep(500); // Small delay to allow async update
        Optional<ScrapingJob> triggeredJob = scrapingJobRepository.findById(existingJob.getId());
        assertTrue(triggeredJob.isPresent());
        assertThat(triggeredJob.get().getStatus()).isEqualTo(ScrapingJob.JobStatus.COMPLETED); // Assuming success
        assertThat(triggeredJob.get().getLastRunAt()).isAfterOrEqualTo(beforeTrigger);

        // Verify that scraped data was created
        assertTrue(scrapedDataRepository.findByScrapingJob(triggeredJob.get(), PageRequest.of(0, 1)).hasContent());
    }

    @Test
    @DisplayName("Should retrieve paginated scraped data for a job")
    void whenGetScrapedData_thenReturnsPaginatedData() {
        // First trigger job to create some data
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .when()
                .post("/api/jobs/{jobId}/trigger", existingJob.getId())
                .then()
                .statusCode(200);

        // Then retrieve data
        given()
                .header("Authorization", "Bearer " + jwtToken)
                .param("page", 0)
                .param("size", 5)
                .when()
                .get("/api/jobs/{jobId}/data", existingJob.getId())
                .then()
                .statusCode(200)
                .body("content", hasSize(greaterThanOrEqualTo(1)))
                .body("number", equalTo(0))
                .body("size", equalTo(5));
    }
}
```