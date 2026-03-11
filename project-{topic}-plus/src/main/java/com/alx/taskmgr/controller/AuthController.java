```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.auth.AuthRequest;
import com.alx.taskmgr.dto.auth.AuthResponse;
import com.alx.taskmgr.dto.auth.RegisterRequest;
import com.alx.taskmgr.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for user authentication and registration.
 * Provides endpoints for user signup and login.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User registration and login operations")
public class AuthController {

    private final AuthService authService;

    /**
     * Registers a new user with the provided details.
     *
     * @param request The RegisterRequest containing user registration data (name, email, password).
     * @return ResponseEntity with an AuthResponse (JWT token) upon successful registration.
     */
    @Operation(summary = "Register a new user",
               responses = {
                   @ApiResponse(responseCode = "201", description = "User registered successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuthResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or email already exists",
                                content = @Content(mediaType = "application/json"))
               })
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Authenticates a user and generates a JWT token upon successful login.
     *
     * @param request The AuthRequest containing user login credentials (email, password).
     * @return ResponseEntity with an AuthResponse (JWT token) upon successful authentication.
     */
    @Operation(summary = "Authenticate user and get JWT token",
               responses = {
                   @ApiResponse(responseCode = "200", description = "User authenticated successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuthResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Invalid credentials",
                                content = @Content(mediaType = "application/json"))
               })
    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> authenticate(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.authenticate(request);
        return ResponseEntity.ok(response);
    }
}
```