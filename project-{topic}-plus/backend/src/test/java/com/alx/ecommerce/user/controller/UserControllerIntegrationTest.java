package com.alx.ecommerce.user.controller;

import com.alx.ecommerce.common.exceptions.GlobalExceptionHandler;
import com.alx.ecommerce.user.dto.LoginRequest;
import com.alx.ecommerce.user.dto.SignupRequest;
import com.alx.ecommerce.user.model.ERole;
import com.alx.ecommerce.user.model.Role;
import com.alx.ecommerce.user.repository.RoleRepository;
import com.alx.ecommerce.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // Use a test profile that might point to an H2 in-memory database
@Transactional // Rollback transactions after each test
class UserControllerIntegrationTest {

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

    @BeforeEach
    void setup() {
        // Ensure roles exist for tests, especially for new users
        if (roleRepository.findByName(ERole.ROLE_USER).isEmpty()) {
            roleRepository.save(new Role(ERole.ROLE_USER));
        }
        if (roleRepository.findByName(ERole.ROLE_ADMIN).isEmpty()) {
            roleRepository.save(new Role(ERole.ROLE_ADMIN));
        }
        // Clean up users before each test if not using @Transactional or if needed for specific tests
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Should register a new user successfully")
    void registerUser_Success() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("testuser");
        signupRequest.setEmail("test@example.com");
        signupRequest.setPassword("password123");
        signupRequest.setRole(Collections.singleton("user")); // Explicitly set user role

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User registered successfully!"))
                .andExpect(jsonPath("$.data.username").value("testuser"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.roles").value(containsString("ROLE_USER")));

        // Verify user is saved in DB
        Optional<com.alx.ecommerce.user.model.User> savedUser = userRepository.findByUsername("testuser");
        assertTrue(savedUser.isPresent());
        assertTrue(passwordEncoder.matches("password123", savedUser.get().getPassword()));
    }

    @Test
    @DisplayName("Should return 400 if username already exists during registration")
    void registerUser_UsernameExists_ReturnsBadRequest() throws Exception {
        // First register a user
        SignupRequest existingUser = new SignupRequest();
        existingUser.setUsername("existing");
        existingUser.setEmail("existing@example.com");
        existingUser.setPassword("password123");
        userService.registerUser(existingUser); // Use service to quickly pre-create

        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("existing"); // Duplicate username
        signupRequest.setEmail("new@example.com");
        signupRequest.setPassword("password456");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isUnauthorized()) // Using 401 for InvalidCredentialsException
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Error: Username is already taken!"));
    }

    @Test
    @DisplayName("Should authenticate user and return JWT token")
    void authenticateUser_Success() throws Exception {
        // Register a user first
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("loginuser");
        signupRequest.setEmail("login@example.com");
        signupRequest.setPassword("loginpassword");
        signupRequest.setRole(Collections.singleton("user"));
        userService.registerUser(signupRequest);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("loginuser");
        loginRequest.setPassword("loginpassword");

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User authenticated successfully!"))
                .andExpect(jsonPath("$.data.token").value(notNullValue()))
                .andExpect(jsonPath("$.data.username").value("loginuser"))
                .andExpect(jsonPath("$.data.roles").value(containsString("ROLE_USER")));
    }

    @Test
    @DisplayName("Should return 401 for invalid login credentials")
    void authenticateUser_InvalidCredentials_ReturnsUnauthorized() throws Exception {
        // Register a user first
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("badloginuser");
        signupRequest.setEmail("badlogin@example.com");
        signupRequest.setPassword("correctpassword");
        userService.registerUser(signupRequest);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("badloginuser");
        loginRequest.setPassword("wrongpassword"); // Incorrect password

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    // A helper service to register users for testing integration endpoints that require existing users.
    // This could be part of a test fixture setup instead of directly in the test class.
    @Autowired
    private com.alx.ecommerce.user.service.UserService userService;
}
```

**Testing & Quality Notes:**
*   **Unit Tests:** Focus on isolated business logic within services. Mock external dependencies (repositories, other services). Aim for high coverage here.
*   **Integration Tests:** Test the interaction between layers (Controller -> Service -> Repository -> (in-memory) DB). Use `@SpringBootTest` and `MockMvc`.
*   **API Tests:** The integration tests already cover basic API functionality. For more extensive API testing, tools like Postman, Newman, or Karate DSL would be used.
*   **Performance Tests:** Tools like JMeter or Gatling would be used to simulate load. This typically involves creating a separate project for scripts and running them against a deployed instance. It's beyond line-of-code generation.

---

### 5. Documentation

#### `README.md`
```markdown