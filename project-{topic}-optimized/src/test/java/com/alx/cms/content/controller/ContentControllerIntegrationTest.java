```java
package com.alx.cms.content.controller;

import com.alx.cms.CmsApplication;
import com.alx.cms.auth.dto.LoginRequest;
import com.alx.cms.auth.dto.JwtResponse;
import com.alx.cms.content.dto.ContentDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest(classes = CmsApplication.class)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Transactional // Rollback transactions after each test
public class ContentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // Use Testcontainers for a real PostgreSQL database
    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.flyway.enabled", () -> "true"); // Enable Flyway for tests
    }

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        // Log in admin user to get a token for authenticated requests
        LoginRequest adminLogin = new LoginRequest("admin@example.com", "adminpass");
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse jwtResponse = objectMapper.readValue(result.getResponse().getContentAsString(), JwtResponse.class);
        adminToken = jwtResponse.getToken();
    }


    @Test
    void createContent_shouldReturnCreatedContent_whenAdminRole() throws Exception {
        ContentDTO newContent = new ContentDTO(
                null, "New Integration Test Content", "new-integration-test-content",
                "This is the body of the new integration test content.", null, false,
                null, null, 1L, 1L, null
        ); // Assuming author ID 1 and category ID 1 exist from V2 migration

        mockMvc.perform(post("/api/v1/contents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newContent)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("New Integration Test Content")))
                .andExpect(jsonPath("$.authorId", is(1)))
                .andExpect(jsonPath("$.published", is(false)));
    }

    @Test
    void createContent_shouldReturnForbidden_whenUserRole() throws Exception {
        // Log in a regular user
        LoginRequest userLogin = new LoginRequest("user@example.com", "userpass");
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse jwtResponse = objectMapper.readValue(result.getResponse().getContentAsString(), JwtResponse.class);
        String userToken = jwtResponse.getToken();

        ContentDTO newContent = new ContentDTO(
                null, "Forbidden Content", "forbidden-content",
                "Body.", null, false, null, null, 1L, 1L, null
        );

        mockMvc.perform(post("/api/v1/contents")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newContent)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getContentById_shouldReturnContent_whenContentExists() throws Exception {
        // Content with ID 1 is from V2__insert_initial_data.sql
        mockMvc.perform(get("/api/v1/contents/1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("Introduction to ALX Software Engineering")));
    }

    @Test
    void getContentBySlug_shouldReturnContent_whenContentExists() throws Exception {
        mockMvc.perform(get("/api/v1/contents/slug/building-restful-api-spring-boot")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Building a RESTful API with Spring Boot")));
    }

    @Test
    void getAllContents_shouldReturnPaginatedContents() throws Exception {
        mockMvc.perform(get("/api/v1/contents?page=0&size=2&sort=id,asc")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(4))) // At least 4 contents from seed
                .andExpect(jsonPath("$.content[0].id", is(1)))
                .andExpect(jsonPath("$.content[1].id", is(2)));
    }

    @Test
    void updateContent_shouldReturnUpdatedContent_whenAdminRole() throws Exception {
        ContentDTO updatedContent = new ContentDTO(
                null, "Updated Title for ALX Content", "updated-title-for-alx-content",
                "This content has been updated.", null, true,
                null, null, 1L, 1L, null
        );

        mockMvc.perform(put("/api/v1/contents/1") // Update content with ID 1
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedContent)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title for ALX Content")))
                .andExpect(jsonPath("$.published", is(true)));
    }

    @Test
    void deleteContent_shouldReturnNoContent_whenAdminRole() throws Exception {
        // First create a new content to delete to avoid deleting seed data repeatedly
        ContentDTO contentToDelete = new ContentDTO(
                null, "Content to Delete", "content-to-delete",
                "Delete me.", null, false, null, null, 1L, 1L, null
        );
        MvcResult createResult = mockMvc.perform(post("/api/v1/contents")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contentToDelete)))
                .andExpect(status().isCreated())
                .andReturn();
        ContentDTO created = objectMapper.readValue(createResult.getResponse().getContentAsString(), ContentDTO.class);

        mockMvc.perform(delete("/api/v1/contents/" + created.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Verify it's actually deleted
        mockMvc.perform(get("/api/v1/contents/" + created.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteContent_shouldReturnForbidden_whenModeratorRole() throws Exception {
        // Log in a moderator user
        LoginRequest modLogin = new LoginRequest("mod@example.com", "modpass");
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(modLogin)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse jwtResponse = objectMapper.readValue(result.getResponse().getContentAsString(), JwtResponse.class);
        String modToken = jwtResponse.getToken();

        mockMvc.perform(delete("/api/v1/contents/1") // Try to delete existing content
                        .header("Authorization", "Bearer " + modToken))
                .andExpect(status().isForbidden());
    }
}
```