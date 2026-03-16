```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.AuthRequest;
import com.alx.taskmgr.exception.UserAlreadyExistsException;
import com.alx.taskmgr.model.Role;
import com.alx.taskmgr.model.User;
import com.alx.taskmgr.repository.UserRepository;
import com.alx.taskmgr.security.JwtService;
import com.alx.taskmgr.security.UserInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@DisplayName("AuthController Unit Tests")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("Should register a new user successfully")
    void shouldRegisterUserSuccessfully() throws Exception {
        AuthRequest registerRequest = AuthRequest.builder()
                .username("newuser")
                .email("newuser@example.com")
                .password("password123")
                .build();

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any(String.class))).thenReturn("encodedpassword");
        when(userRepository.save(any(User.class))).thenReturn(User.builder().id(1L).username("newuser").build());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").value("User registered successfully!"));
    }

    @Test
    @DisplayName("Should return conflict if username already exists during registration")
    void shouldReturnConflictWhenUsernameExists() throws Exception {
        AuthRequest registerRequest = AuthRequest.builder()
                .username("existinguser")
                .email("existing@example.com")
                .password("password123")
                .build();

        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username is already taken!"));
    }

    @Test
    @DisplayName("Should return conflict if email already exists during registration")
    void shouldReturnConflictWhenEmailExists() throws Exception {
        AuthRequest registerRequest = AuthRequest.builder()
                .username("newuser")
                .email("existing@example.com")
                .password("password123")
                .build();

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(false); // Simulate check before throwing
        when(userRepository.existsByEmail("existing@example.com")).thenThrow(new UserAlreadyExistsException("Email is already in use!")); // Actual behavior

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email is already in use!"));
    }

    @Test
    @DisplayName("Should login user successfully and return JWT token")
    void shouldLoginUserSuccessfully() throws Exception {
        AuthRequest loginRequest = AuthRequest.builder()
                .username("testuser")
                .password("password123")
                .build();

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(), loginRequest.getPassword());

        UserInfo userDetails = UserInfo.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedpassword")
                .role(Role.ROLE_USER)
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(jwtService.generateToken(any(Authentication.class))).thenReturn("mockJwtToken");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mockJwtToken"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("Should return unauthorized for invalid login credentials")
    void shouldReturnUnauthorizedForInvalidCredentials() throws Exception {
        AuthRequest loginRequest = AuthRequest.builder()
                .username("invaliduser")
                .password("wrongpassword")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bad credentials"));
    }
}
```