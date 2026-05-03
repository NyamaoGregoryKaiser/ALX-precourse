package com.alx.scraper.integration;

import com.alx.scraper.ScraperApplication;
import com.alx.scraper.dto.LoginRequest;
import com.alx.scraper.dto.ScrapingJobCreateDTO;
import com.alx.scraper.dto.ScrapingJobDTO;
import com.alx.scraper.dto.UserDTO;
import com.alx.scraper.entity.ScrapingStatus;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = ScraperApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test") // Use application-test.properties
@Testcontainers // Enables Testcontainers support
class ScraperIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScrapingJobRepository scrapingJobRepository;

    private String userToken;
    private String adminToken;
    private Long testUserId;
    private Long testAdminId;

    @BeforeEach
    void setUp() throws Exception {
        // Ensure database is clean if not using proper Testcontainers per-test lifecycle
        scrapingJobRepository.deleteAll();
        userRepository.deleteAll(); // This will clear users created by V2__add_seed_data.sql for this test run.
                                    // A better approach for integration tests might be to load a minimal dataset.

        // Register a user and get a token
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new com.alx.scraper.dto.RegisterRequest("Test User", "integration_user", "user_integration@example.com", "userpass"))))
                .andExpect(status().isCreated());

        MvcResult userLoginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("integration_user", "userpass"))))
                .andExpect(status().isOk())
                .andReturn();
        userToken = objectMapper.readTree(userLoginResult.getResponse().getContentAsString()).get("accessToken").asText();

        // Register an admin and get a token (assuming admin role can be set via registration or manually in test setup)
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new com.alx.scraper.dto.RegisterRequest("Test Admin", "integration_admin", "admin_integration@example.com", "adminpass"))))
                .andExpect(status().isCreated());

        // Manually assign ADMIN role to 'integration_admin' for testing, as simple registration only gives ROLE_USER
        userRepository.findByUsername("integration_admin").ifPresent(user -> {
            userRepository.findByName(com.alx.scraper.entity.Role.ERole.ROLE_ADMIN)
                          .ifPresent(role -> {
                              user.getRoles().add(role);
                              userRepository.save(user);
                          });
            testAdminId = user.getId();
        });
        userRepository.findByUsername("integration_user").ifPresent(user -> testUserId = user.getId());


        MvcResult adminLoginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("integration_admin", "adminpass"))))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readTree(adminLoginResult.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @AfterEach
    void tearDown() {
        scrapingJobRepository.deleteAll();
        userRepository.deleteAll();
    }


    @Test
    @DisplayName("User should be able to create, retrieve, update, and delete their own scraping jobs")
    void userJobLifecycleTest() throws Exception {
        // 1. Create Job
        ScrapingJobCreateDTO createDTO = new ScrapingJobCreateDTO();
        createDTO.setJobName("My First Job");
        createDTO.setTargetUrl("https://books.toscrape.com/"); // Use a real, publicly accessible scraping target
        createDTO.setSelectors(Map.of("productTitle", "h3 a", "productPrice", ".price_color"));
        createDTO.setMaxPagesToScrape(1);

        MvcResult createResult = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.jobName", is("My First Job")))
                .andExpect(jsonPath("$.userId", is(testUserId), Long.class))
                .andReturn();

        ScrapingJobDTO createdJob = objectMapper.readValue(createResult.getResponse().getContentAsString(), ScrapingJobDTO.class);
        assertNotNull(createdJob.getId());
        assertEquals(ScrapingStatus.CREATED, createdJob.getStatus());

        // 2. Retrieve Job by ID
        mockMvc.perform(get("/api/jobs/{id}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobName", is("My First Job")));

        // 3. Update Job
        createDTO.setJobName("Updated Job Name");
        createDTO.setTargetUrl("https://books.toscrape.com/catalogue/category/books/travel_2/");
        createDTO.setSelectors(Map.of("itemTitle", "h3 a", "itemPrice", ".price_color"));

        mockMvc.perform(put("/api/jobs/{id}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobName", is("Updated Job Name")))
                .andExpect(jsonPath("$.targetUrl", is("https://books.toscrape.com/catalogue/category/books/travel_2/")));

        // 4. Get All Jobs (should see the updated one)
        mockMvc.perform(get("/api/jobs")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].jobName", is("Updated Job Name")));

        // 5. Delete Job
        mockMvc.perform(delete("/api/jobs/{id}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/api/jobs/{id}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Admin should be able to view all users")
    void adminCanViewAllUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2))) // admin + user
                .andExpect(jsonPath("$[0].username").exists())
                .andExpect(jsonPath("$[1].username").exists());
    }

    @Test
    @DisplayName("Regular user should not be able to view all users")
    void userCannotViewAllUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthorized access to protected endpoints should return 401")
    void unauthorizedAccessTest() throws Exception {
        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Scraping job should transition from CREATED to RUNNING to COMPLETED and save data")
    void scrapingJobExecutionTest() throws Exception {
        // 1. Create a scraping job
        ScrapingJobCreateDTO createDTO = new ScrapingJobCreateDTO();
        createDTO.setJobName("E-commerce Scrape Test");
        // Using a real, simple public site for scraping example
        createDTO.setTargetUrl("https://books.toscrape.com/");
        createDTO.setSelectors(Map.of(
                "bookTitle", "article.product_pod h3 a",
                "bookPrice", "article.product_pod .price_color"
        ));
        createDTO.setMaxPagesToScrape(1); // Scrape only the first page

        MvcResult createResult = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated())
                .andReturn();
        ScrapingJobDTO createdJob = objectMapper.readValue(createResult.getResponse().getContentAsString(), ScrapingJobDTO.class);
        assertEquals(ScrapingStatus.CREATED, createdJob.getStatus());

        // 2. Start the scraping job
        MvcResult startResult = mockMvc.perform(post("/api/jobs/{id}/start", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(ScrapingStatus.RUNNING.name())))
                .andReturn();
        ScrapingJobDTO startedJob = objectMapper.readValue(startResult.getResponse().getContentAsString(), ScrapingJobDTO.class);

        // Wait for the job to complete (non-blocking in real app, but for test we need to poll/wait)
        // In a real integration test, you might use Awaitility or similar to poll the job status.
        // For simplicity, a hard sleep, but this is brittle.
        Thread.sleep(5000); // Give scraper some time to run

        // 3. Retrieve the job status after completion
        MvcResult completedResult = mockMvc.perform(get("/api/jobs/{id}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();
        ScrapingJobDTO completedJob = objectMapper.readValue(completedResult.getResponse().getContentAsString(), ScrapingJobDTO.class);

        assertEquals(ScrapingStatus.COMPLETED, completedJob.getStatus());
        assertNotNull(completedJob.getStartedAt());
        assertNotNull(completedJob.getCompletedAt());
        assertTrue(completedJob.getPagesScrapedCount() > 0);
        assertTrue(completedJob.getDataEntriesCount() > 0);

        // 4. Retrieve the scraped data
        mockMvc.perform(get("/api/scraped-data/job/{jobId}", createdJob.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize((int) completedJob.getDataEntriesCount())))
                .andExpect(jsonPath("$[0].extractedData.bookTitle").exists())
                .andExpect(jsonPath("$[0].extractedData.bookPrice").exists());
    }

    @Test
    @DisplayName("Rate limit should apply to API endpoints")
    void rateLimitTest() throws Exception {
        // Assume default rate limit is 5 requests per 10 seconds (from RateLimitInterceptor)
        // Send 5 requests, all should pass
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/jobs")
                            .header("Authorization", "Bearer " + userToken))
                    .andExpect(status().isOk());
        }

        // The 6th request should be rate-limited
        mockMvc.perform(get("/api/jobs")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isTooManyRequests())
                .andExpect(content().string(is("You have exceeded the API rate limit. Please try again after 10 seconds.")));

        // Wait for the rate limit window to reset
        Thread.sleep(10000); // 10 seconds + a little buffer

        // Should be able to make a request again
        mockMvc.perform(get("/api/jobs")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());
    }
}
```