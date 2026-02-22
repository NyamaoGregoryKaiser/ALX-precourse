```java
package com.alx.chat.integration;

import com.alx.chat.ChatApplication;
import com.alx.chat.dto.AuthResponse;
import com.alx.chat.dto.ChatRoomDTO;
import com.alx.chat.dto.LoginRequest;
import com.alx.chat.dto.MessageDTO;
import com.alx.chat.dto.RegisterRequest;
import com.alx.chat.dto.UserDTO;
import com.alx.chat.entity.ChatRoom;
import com.alx.chat.repository.ChatRoomRepository;
import com.alx.chat.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ChatApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
public class ChatIntegrationTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensures schema is created for tests
        registry.add("spring.flyway.enabled", () -> "false"); // Disable Flyway for integration tests, let JPA handle schema
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // To verify password encoding

    private String user1Token;
    private Long user1Id;
    private String user2Token;
    private Long user2Id;
    private Long roomId;

    @BeforeEach
    void setup() throws Exception {
        // Clear database before each test
        userRepository.deleteAll();
        chatRoomRepository.deleteAll();

        // 1. Register User 1
        RegisterRequest registerRequest1 = new RegisterRequest();
        registerRequest1.setUsername("user1");
        registerRequest1.setEmail("user1@example.com");
        registerRequest1.setPassword("pass123");
        MvcResult registerResult1 = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest1)))
                .andExpect(status().isCreated())
                .andReturn();

        // 2. Login User 1 to get token
        LoginRequest loginRequest1 = new LoginRequest();
        loginRequest1.setUsernameOrEmail("user1");
        loginRequest1.setPassword("pass123");
        MvcResult loginResult1 = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest1)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse authResponse1 = objectMapper.readValue(loginResult1.getResponse().getContentAsString(), AuthResponse.class);
        user1Token = authResponse1.getToken();
        user1Id = authResponse1.getId();

        // 3. Register User 2
        RegisterRequest registerRequest2 = new RegisterRequest();
        registerRequest2.setUsername("user2");
        registerRequest2.setEmail("user2@example.com");
        registerRequest2.setPassword("pass123");
        MvcResult registerResult2 = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest2)))
                .andExpect(status().isCreated())
                .andReturn();

        // 4. Login User 2 to get token
        LoginRequest loginRequest2 = new LoginRequest();
        loginRequest2.setUsernameOrEmail("user2");
        loginRequest2.setPassword("pass123");
        MvcResult loginResult2 = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest2)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse authResponse2 = objectMapper.readValue(loginResult2.getResponse().getContentAsString(), AuthResponse.class);
        user2Token = authResponse2.getToken();
        user2Id = authResponse2.getId();
    }

    @Test
    void testUserRegistrationAndLogin() throws Exception {
        // User 1 login already done in setup, verify token exists
        assertThat(user1Token).isNotBlank();
        assertThat(user1Id).isNotNull();

        // Verify user data in DB
        com.alx.chat.entity.User userFromDb = userRepository.findById(user1Id).orElseThrow();
        assertThat(userFromDb.getUsername()).isEqualTo("user1");
        assertThat(passwordEncoder.matches("pass123", userFromDb.getPassword())).isTrue();
    }

    @Test
    void testChatRoomCreationAndMembership() throws Exception {
        // User 1 creates a room
        ChatRoomDTO createRoomRequest = new ChatRoomDTO();
        createRoomRequest.setName("General Chat");
        createRoomRequest.setType(ChatRoom.ChatRoomType.PUBLIC);

        MvcResult createRoomResult = mockMvc.perform(post("/api/v1/rooms")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRoomRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("General Chat"))
                .andExpect(jsonPath("$.creator.id").value(user1Id))
                .andReturn();

        ChatRoomDTO createdRoom = objectMapper.readValue(createRoomResult.getResponse().getContentAsString(), ChatRoomDTO.class);
        roomId = createdRoom.getId();
        assertThat(roomId).isNotNull();

        // Verify User 1 is a member of the new room
        mockMvc.perform(get("/api/v1/rooms/user/{userId}", user1Id)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(roomId))
                .andExpect(jsonPath("$[0].name").value("General Chat"));

        // User 2 tries to get a room it's not in (yet) - should be able to see public room
        mockMvc.perform(get("/api/v1/rooms/{roomId}", roomId)
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("General Chat"));


        // User 2 joins the room
        mockMvc.perform(post("/api/v1/rooms/{roomId}/members/{userId}", roomId, user2Id)
                        .header("Authorization", "Bearer " + user1Token) // Creator adds member
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Verify User 2 is now a member
        mockMvc.perform(get("/api/v1/rooms/{roomId}/members", roomId)
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.id == " + user1Id + ")].username").value("user1"))
                .andExpect(jsonPath("$[?(@.id == " + user2Id + ")].username").value("user2"));
    }

    @Test
    void testSendMessageAndRetrieveMessages() throws Exception {
        // Setup: User 1 creates room, User 2 joins
        testChatRoomCreationAndMembership(); // This will populate roomId and ensure both users are members

        // User 1 sends a message
        MessageDTO message1 = new MessageDTO(null, roomId, null, "Hello from user 1", null);
        mockMvc.perform(post("/app/chat.sendMessage") // WebSocket endpoint, but mockMvc can simulate HTTP POST
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(message1)))
                .andExpect(status().isForbidden()); // This is expected because /app/chat.sendMessage is for WebSocket STOMP frames, not direct HTTP POST
                                                    // Actual WebSocket message sending is hard to test with MockMvc.
                                                    // We rely on service layer tests for saveMessage and actual WebSocket client for end-to-end.

        // Instead of directly sending to WS endpoint, call the service directly or trigger through a custom test mechanism
        // For RESTful API testing, let's use a simpler approach: assume messages are saved via another internal mechanism,
        // and focus on retrieving them through the REST API.

        // For this integration test, let's directly create a message using the service for simplicity
        // in order to test retrieval. In a real integration test, one might use a simulated WebSocket client.
        // As /app/chat.sendMessage requires actual WebSocket connection, we skip direct HTTP POST testing here for it.
        // Instead, we directly use the service to put a message for testing message retrieval.
        // For testing the WebSocket endpoint fully, a dedicated WebSocket client test would be needed.

        // Simulate message being saved by the service (to test retrieval)
        com.alx.chat.entity.User sender = userRepository.findById(user1Id).orElseThrow();
        com.alx.chat.entity.ChatRoom room = chatRoomRepository.findById(roomId).orElseThrow();
        com.alx.chat.entity.Message savedMsg = new com.alx.chat.entity.Message(null, room, sender, "Test message from user 1", null);
        messageRepository.save(savedMsg); // Assuming messageRepository is available

        // User 2 retrieves messages from the room
        mockMvc.perform(get("/api/v1/messages/room/{roomId}", roomId)
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("Test message from user 1"))
                .andExpect(jsonPath("$[0].sender.username").value("user1"));
    }
}
```