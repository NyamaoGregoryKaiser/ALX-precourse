package com.alxchat;

import com.alxchat.auth.AuthRequest;
import com.alxchat.auth.AuthResponse;
import com.alxchat.dto.ChatRoomDTO;
import com.alxchat.dto.CreateRoomDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RedisContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("ALXChat Application Integration Tests")
class AlxChatApplicationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static String jwtToken;
    private static Long createdRoomId;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:15.3-alpine"))
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpassword");

    @Container
    static RedisContainer redis = new RedisContainer(DockerImageName.parse("redis:7.0.12-alpine"));


    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", () -> redis.getMappedPort(6379).toString());
    }

    @BeforeAll
    static void setup() {
        postgres.start();
        redis.start();
    }

    @Test
    @Order(1)
    @DisplayName("User Registration - Success")
    void testUserRegistration() throws Exception {
        AuthRequest registerRequest = new AuthRequest("testuser", "testpassword");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @Order(2)
    @DisplayName("User Login - Success")
    void testUserLogin() throws Exception {
        AuthRequest loginRequest = new AuthRequest("testuser", "testpassword");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jwt").exists())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        jwtToken = authResponse.getJwt();
        assertNotNull(jwtToken);
    }

    @Test
    @Order(3)
    @DisplayName("Get Current User - Authenticated")
    void testGetCurrentUser() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.status").value("OFFLINE"));
    }

    @Test
    @Order(4)
    @DisplayName("Create Chat Room - Success")
    @Transactional // For lazy loading of participants in ChatRoomService.fromEntityWithParticipants
    void testCreateChatRoom() throws Exception {
        CreateRoomDTO createRoomDTO = new CreateRoomDTO("IntegrationTestRoom");

        MvcResult result = mockMvc.perform(post("/api/chatrooms")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRoomDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("IntegrationTestRoom"))
                .andExpect(jsonPath("$.creator.username").value("testuser"))
                .andExpect(jsonPath("$.participantCount").value(1))
                .andReturn();

        ChatRoomDTO chatRoomDTO = objectMapper.readValue(result.getResponse().getContentAsString(), ChatRoomDTO.class);
        createdRoomId = chatRoomDTO.getId();
        assertNotNull(createdRoomId);
    }

    @Test
    @Order(5)
    @DisplayName("Get Chat Room By ID - Success")
    @Transactional
    void testGetChatRoomById() throws Exception {
        mockMvc.perform(get("/api/chatrooms/{id}", createdRoomId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("IntegrationTestRoom"))
                .andExpect(jsonPath("$.creator.username").value("testuser"))
                .andExpect(jsonPath("$.participantCount").value(1))
                .andExpect(jsonPath("$.participants[0].username").value("testuser"));
    }

    @Test
    @Order(6)
    @DisplayName("Send Message to Chat Room - Success (API Test, WebSocket broadcast is separate)")
    void testSendMessage() throws Exception {
        // First, get the current user's ID
        MvcResult userResult = mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();
        Long userId = objectMapper.readTree(userResult.getResponse().getContentAsString()).get("id").asLong();

        // Simulate sending a message via the REST API for initial testing of persistence logic
        // (Real-time sending would be via WebSocket)
        String messageContent = "Hello from integration test!";
        String newMessagePayload = "{\"content\":\"" + messageContent + "\", \"roomId\":" + createdRoomId + "}";

        mockMvc.perform(post("/api/messages/chat.sendMessage") // This path is generally for WebSocket, but we can test internal logic via MockMvc
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(newMessagePayload))
                .andExpect(status().isOk()); // WebSocket methods typically return 200 OK after processing
    }

    @Test
    @Order(7)
    @DisplayName("Get Message History - Success")
    void testGetMessageHistory() throws Exception {
        mockMvc.perform(get("/api/messages/room/{roomId}", createdRoomId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Hello from integration test!"))
                .andExpect(jsonPath("$[0].sender.username").value("testuser"));
    }

    @Test
    @Order(8)
    @DisplayName("Access Unauthorized Endpoint")
    void testUnauthorizedAccess() throws Exception {
        mockMvc.perform(get("/api/users/me")) // No JWT token
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(9)
    @DisplayName("Rate Limiting Test - Too Many Requests")
    void testRateLimiting() throws Exception {
        // Assuming the rate limit is 10 requests/minute.
        // We'll send more than that to trigger the limit.
        for (int i = 0; i < 11; i++) { // 11 requests
            if (i < 10) {
                mockMvc.perform(get("/api/users/me")
                                .header("Authorization", "Bearer " + jwtToken))
                        .andExpect(status().isOk());
            } else {
                // The 11th request should be rate-limited
                mockMvc.perform(get("/api/users/me")
                                .header("Authorization", "Bearer " + jwtToken))
                        .andExpect(status().isTooManyRequests())
                        .andExpect(result -> assertTrue(result.getResponse().getContentAsString().contains("Too many requests")));
            }
        }
    }
}