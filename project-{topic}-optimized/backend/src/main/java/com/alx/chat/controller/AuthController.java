```java
package com.alx.chat.controller;

import com.alx.chat.dto.AuthRequest;
import com.alx.chat.dto.AuthResponse;
import com.alx.chat.dto.RegisterRequest;
import com.alx.chat.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for user authentication and registration.
 * Handles API endpoints for /api/auth.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "User registration and login APIs")
public class AuthController {

    private final AuthService authService;

    /**
     * Registers a new user.
     * @param request RegisterRequest containing username, email, and password.
     * @return ResponseEntity with an AuthResponse (JWT token) upon successful registration.
     */
    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        log.info("Attempting to register user: {}", request.getUsername());
        AuthResponse response = authService.register(request);
        log.info("User registered successfully: {}", request.getUsername());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Authenticates an existing user and provides a JWT token.
     * @param request AuthRequest containing username and password.
     * @return ResponseEntity with an AuthResponse (JWT token) upon successful login.
     */
    @Operation(summary = "Authenticate user and get JWT token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody AuthRequest request) {
        log.info("Attempting to log in user: {}", request.getUsername());
        AuthResponse response = authService.login(request);
        log.info("User logged in successfully: {}", request.getUsername());
        return ResponseEntity.ok(response);
    }
}
```