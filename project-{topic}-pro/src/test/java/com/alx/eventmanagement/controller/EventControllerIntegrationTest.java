```java
package com.alx.eventmanagement.controller;

import com.alx.eventmanagement.auth.dto.AuthRequest;
import com.alx.eventmanagement.auth.dto.JwtResponse;
import com.alx.eventmanagement.auth.dto.RegisterRequest;
import com.alx.eventmanagement.category.dto.CreateCategoryDTO;
import com.alx.eventmanagement.category.model.Category;
import com.alx.eventmanagement.event.dto.CreateEventDTO;
import com.alx.eventmanagement.event.dto.CreateTicketTypeDTO;
import com.alx.eventmanagement.event.dto.EventDTO;
import com.alx.eventmanagement.event.dto.UpdateEventDTO;
import com.alx.eventmanagement.event.dto.UpdateTicketTypeDTO;
import com.alx.eventmanagement.event.model.Event;
import com.alx.eventmanagement.event.model.TicketType;
import com.alx.eventmanagement.event.repository.EventRepository;
import com.alx.eventmanagement.event.repository.TicketTypeRepository;
import com.alx.eventmanagement.user.model.Role;
import com.alx.eventmanagement.user.model.User;
import com.alx.eventmanagement.user.repository.RoleRepository;
import com.alx.eventmanagement.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional // Rollback changes after each test
class EventControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensures fresh schema for each test run
        registry.add("spring.jpa.show-sql", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    private String organizerJwtToken;
    private String userJwtToken;
    private String adminJwtToken;
    private User organizer;
    private Category testCategory;
    private Event testEvent;
    private TicketType testTicketType;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Clear existing data for a clean slate, especially for roles/users
        userRepository.deleteAll();
        roleRepository.deleteAll();
        eventRepository.deleteAll();
        ticketTypeRepository.deleteAll();

        // Seed roles
        Role userRole = roleRepository.save(new Role(null, Role.RoleName.ROLE_USER));
        Role organizerRole = roleRepository.save(new Role(null, Role.RoleName.ROLE_ORGANIZER));
        Role adminRole = roleRepository.save(new Role(null, Role.RoleName.ROLE_ADMIN));

        // Register and login organizer
        RegisterRequest orgRegister = new RegisterRequest("organizer_test", "org@test.com", "password123", "Org", "Test", Set.of("ROLE_ORGANIZER"));
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgRegister)))
                .andExpect(status().isCreated());

        AuthRequest orgAuth = new AuthRequest("organizer_test", "password123");
        MvcResult orgLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orgAuth)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse orgJwtResponse = objectMapper.readValue(orgLoginResult.getResponse().getContentAsString(), JwtResponse.class);
        organizerJwtToken = orgJwtResponse.getToken();
        organizer = userRepository.findByUsername("organizer_test").orElseThrow();

        // Register and login regular user
        RegisterRequest userRegister = new RegisterRequest("user_test", "user@test.com", "password123", "User", "Test", Set.of("ROLE_USER"));
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userRegister)))
                .andExpect(status().isCreated());

        AuthRequest userAuth = new AuthRequest("user_test", "password123");
        MvcResult userLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userAuth)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse userJwtResponse = objectMapper.readValue(userLoginResult.getResponse().getContentAsString(), JwtResponse.class);
        userJwtToken = userJwtResponse.getToken();

        // Register and login admin (if needed for admin-specific tests)
        User admin = User.builder()
                .id(UUID.randomUUID())
                .username("admin_test")
                .email("admin@test.com")
                .password(passwordEncoder.encode("adminpassword"))
                .roles(Set.of(adminRole))
                .build();
        userRepository.save(admin);

        AuthRequest adminAuth = new AuthRequest("admin_test", "adminpassword");
        MvcResult adminLoginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminAuth)))
                .andExpect(status().isOk())
                .andReturn();
        JwtResponse adminJwtResponse = objectMapper.readValue(adminLoginResult.getResponse().getContentAsString(), JwtResponse.class);
        adminJwtToken = adminJwtResponse.getToken();


        // Create a test category
        CreateCategoryDTO createCategoryDTO = new CreateCategoryDTO();
        createCategoryDTO.setName("Concert");
        createCategoryDTO.setDescription("Live music performances");
        MvcResult categoryResult = mockMvc.perform(post("/api/v1/categories")
                        .header("Authorization", "Bearer " + adminJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createCategoryDTO)))
                .andExpect(status().isCreated())
                .andReturn();
        testCategory = objectMapper.readValue(categoryResult.getResponse().getContentAsString(), Category.class);

        // Create a test event by organizer
        CreateTicketTypeDTO createTicketTypeDTO = new CreateTicketTypeDTO();
        createTicketTypeDTO.setName("Standard");
        createTicketTypeDTO.setPrice(BigDecimal.valueOf(50.00));
        createTicketTypeDTO.setQuantity(100);

        CreateEventDTO createEventDTO = new CreateEventDTO();
        createEventDTO.setTitle("Test Event for Update/Delete");
        createEventDTO.setDescription("A test event");
        createEventDTO.setLocation("Test City");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(5));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(5).plusHours(3));
        createEventDTO.setTotalCapacity(200);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(createTicketTypeDTO));

        MvcResult eventResult = mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", "Bearer " + organizerJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createEventDTO)))
                .andExpect(status().isCreated())
                .andReturn();
        testEvent = objectMapper.readValue(eventResult.getResponse().getContentAsString(), Event.class);
        testTicketType = ticketTypeRepository.findByEventId(testEvent.getId()).stream().findFirst().orElseThrow();
    }

    @Test
    void getAllEvents_shouldReturnEvents() throws Exception {
        mockMvc.perform(get("/api/v1/events")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].title").value(testEvent.getTitle()));
    }

    @Test
    void getEventById_shouldReturnEvent() throws Exception {
        mockMvc.perform(get("/api/v1/events/{id}", testEvent.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testEvent.getId().toString()))
                .andExpect(jsonPath("$.title").value(testEvent.getTitle()));
    }

    @Test
    void getEventById_notFound_shouldReturnNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/events/{id}", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void createEvent_asOrganizer_shouldSucceed() throws Exception {
        CreateTicketTypeDTO newTicketType = new CreateTicketTypeDTO();
        newTicketType.setName("VIP");
        newTicketType.setPrice(BigDecimal.valueOf(100.00));
        newTicketType.setQuantity(50);

        CreateEventDTO createEventDTO = new CreateEventDTO();
        createEventDTO.setTitle("New Concert");
        createEventDTO.setDescription("A great concert");
        createEventDTO.setLocation("Venue Hall");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(10));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(10).plusHours(4));
        createEventDTO.setTotalCapacity(300);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(newTicketType));

        mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", "Bearer " + organizerJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createEventDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Concert"))
                .andExpect(jsonPath("$.organizer.id").value(organizer.getId().toString()));
    }

    @Test
    void createEvent_asUser_shouldReturnForbidden() throws Exception {
        CreateEventDTO createEventDTO = new CreateEventDTO(); // Minimal valid DTO
        createEventDTO.setTitle("Forbidden Event");
        createEventDTO.setLocation("Location");
        createEventDTO.setStartTime(LocalDateTime.now().plusDays(1));
        createEventDTO.setEndTime(LocalDateTime.now().plusDays(2));
        createEventDTO.setTotalCapacity(100);
        createEventDTO.setCategoryId(testCategory.getId());
        createEventDTO.setTicketTypes(List.of(new CreateTicketTypeDTO("Standard", "desc", BigDecimal.valueOf(10), 50)));

        mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", "Bearer " + userJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createEventDTO)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateEvent_asOrganizer_shouldSucceed() throws Exception {
        UpdateTicketTypeDTO updateTicketTypeDTO = new UpdateTicketTypeDTO();
        updateTicketTypeDTO.setId(testTicketType.getId());
        updateTicketTypeDTO.setName("Premium Ticket");
        updateTicketTypeDTO.setPrice(BigDecimal.valueOf(75.00));
        updateTicketTypeDTO.setTotalQuantity(80); // Decreased from 100

        CreateTicketTypeDTO newTicketType = new CreateTicketTypeDTO();
        newTicketType.setName("Super VIP");
        newTicketType.setPrice(BigDecimal.valueOf(200.00));
        newTicketType.setQuantity(10);

        UpdateEventDTO updateEventDTO = new UpdateEventDTO();
        updateEventDTO.setTitle("Updated Test Event");
        updateEventDTO.setLocation("New City");
        updateEventDTO.setTicketTypes(List.of(updateTicketTypeDTO));
        updateEventDTO.setNewTicketTypes(List.of(newTicketType));

        MvcResult result = mockMvc.perform(put("/api/v1/events/{id}", testEvent.getId())
                        .header("Authorization", "Bearer " + organizerJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateEventDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Test Event"))
                .andExpect(jsonPath("$.location").value("New City"))
                .andExpect(jsonPath("$.availableTickets").value(90)) // 100 - 20 (decrease) + 10 (new) = 90
                .andReturn();

        EventDTO updatedEvent = objectMapper.readValue(result.getResponse().getContentAsString(), EventDTO.class);
        assertEquals(2, updatedEvent.getTicketTypes().size()); // Original + new VIP
        assertEquals("Premium Ticket", updatedEvent.getTicketTypes().stream().filter(t -> t.getId().equals(testTicketType.getId())).findFirst().orElseThrow().getName());
    }

    @Test
    void updateEvent_asUser_shouldReturnForbidden() throws Exception {
        UpdateEventDTO updateEventDTO = new UpdateEventDTO();
        updateEventDTO.setTitle("Attempted update");

        mockMvc.perform(put("/api/v1/events/{id}", testEvent.getId())
                        .header("Authorization", "Bearer " + userJwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateEventDTO)))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteEvent_asOrganizer_shouldSucceed() throws Exception {
        mockMvc.perform(delete("/api/v1/events/{id}", testEvent.getId())
                        .header("Authorization", "Bearer " + organizerJwtToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/events/{id}", testEvent.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()); // Verify it's deleted
    }

    @Test
    void deleteEvent_asUser_shouldReturnForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/events/{id}", testEvent.getId())
                        .header("Authorization", "Bearer " + userJwtToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
```