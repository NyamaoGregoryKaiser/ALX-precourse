```java
package com.alx.devops.productmanagement.controller;

import com.alx.devops.productmanagement.config.JwtAuthFilter;
import com.alx.devops.productmanagement.config.RateLimitingFilter;
import com.alx.devops.productmanagement.config.SecurityConfig;
import com.alx.devops.productmanagement.dto.AuthRequest;
import com.alx.devops.productmanagement.dto.AuthResponse;
import com.alx.devops.productmanagement.dto.UserDTO;
import com.alx.devops.productmanagement.exception.GlobalExceptionHandler;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.model.Role;
import com.alx.devops.productmanagement.service.AuthService;
import com.alx.devops.productmanagement.service.UserDetailsServiceImpl;
import com.alx.devops.productmanagement.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class}) // Import SecurityConfig and exception handler
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean // Mock security components
    private UserDetailsServiceImpl userDetailsService;
    @MockBean
    private JwtAuthFilter jwtAuthFilter;
    @MockBean
    private JwtUtil jwtUtil;
    @MockBean
    private RateLimitingFilter rateLimitingFilter; // Mock the rate limiting filter

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        // Ensure rateLimitingFilter always allows requests for tests
        when(rateLimitingFilter.shouldNotFilter(any())).thenReturn(true);
    }

    @Test
    void testRegisterUser_Success() throws Exception {
        UserDTO newUser = new UserDTO();
        newUser.setUsername("testuser");
        newUser.setPassword("password123");
        newUser.setRole(Role.ROLE_USER);

        UserDTO registeredUser = new UserDTO();
        registeredUser.setId(1L);
        registeredUser.setUsername("testuser");
        registeredUser.setRole(Role.ROLE_USER);

        when(authService.registerUser(any(UserDTO.class))).thenReturn(registeredUser);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    void testRegisterUser_InvalidInput() throws Exception {
        UserDTO invalidUser = new UserDTO(); // Missing username and password
        invalidUser.setUsername("");
        invalidUser.setPassword("123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidUser)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.username").exists())
                .andExpect(jsonPath("$.password").exists());
    }

    @Test
    void testRegisterUser_UsernameExists() throws Exception {
        UserDTO newUser = new UserDTO();
        newUser.setUsername("existinguser");
        newUser.setPassword("password123");

        when(authService.registerUser(any(UserDTO.class)))
                .thenThrow(new ValidationException("Username existinguser already exists."));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username existinguser already exists."));
    }

    @Test
    void testLogin_Success() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("testuser");
        authRequest.setPassword("password123");

        AuthResponse authResponse = new AuthResponse("mock_jwt_token", "testuser", "ROLE_USER");

        when(authService.login(any(AuthRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jwtToken").value("mock_jwt_token"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    void testLogin_InvalidCredentials() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("wronguser");
        authRequest.setPassword("wrongpass");

        when(authService.login(any(AuthRequest.class)))
                .thenThrow(new ValidationException("Invalid username or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void testLogin_MissingCredentials() throws Exception {
        AuthRequest authRequest = new AuthRequest(); // Missing username/password
        authRequest.setUsername("");
        authRequest.setPassword("");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.username").exists())
                .andExpect(jsonPath("$.password").exists());
    }
}
```