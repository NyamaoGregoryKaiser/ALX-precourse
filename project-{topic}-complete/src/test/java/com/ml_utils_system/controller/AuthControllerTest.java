```java
package com.ml_utils_system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml_utils_system.config.TestSecurityConfig;
import com.ml_utils_system.dto.AuthResponseDto;
import com.ml_utils_system.dto.LoginRequestDto;
import com.ml_utils_system.dto.RegisterRequestDto;
import com.ml_utils_system.dto.UserDto;
import com.ml_utils_system.exception.GlobalExceptionHandler;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API tests for {@link AuthController}.
 * Uses {@link WebMvcTest} to focus on the controller layer, mocking the service layer.
 * Imports {@link TestSecurityConfig} to provide a simplified security context for tests.
 */
@WebMvcTest(AuthController.class)
@Import({TestSecurityConfig.class, GlobalExceptionHandler.class}) // Import global exception handler too
@ActiveProfiles("test")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Should authenticate user successfully and return 200 OK")
    void authenticateUser_success() throws Exception {
        LoginRequestDto loginRequest =