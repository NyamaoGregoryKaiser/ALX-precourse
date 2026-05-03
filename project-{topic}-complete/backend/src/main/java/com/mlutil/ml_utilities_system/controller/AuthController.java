package com.mlutil.ml_utilities_system.controller;

import com.mlutil.ml_utilities_system.dto.auth.AuthRequest;
import com.mlutil.ml_utilities_system.dto.auth.AuthResponse;
import com.mlutil.ml_utilities_system.dto.auth.RegisterRequest;
import com.mlutil.ml_utilities_system.model.User;
import com.mlutil.ml_utilities_system.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "User authentication and registration API")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Authenticate user and get JWT token",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Authentication successful"),
                    @ApiResponse(responseCode = "401", description = "Invalid credentials")
            })
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest authRequest) {
        log.info("Attempting to authenticate user: {}", authRequest.getUsername());
        String token = authService.authenticateAndGetToken(authRequest.getUsername(), authRequest.getPassword());
        log.info("User {} authenticated successfully.", authRequest.getUsername());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @Operation(summary = "Register a new user",
            responses = {
                    @ApiResponse(responseCode = "201", description = "User registered successfully"),
                    @ApiResponse(responseCode = "400", description = "Invalid input or username already exists")
            })
    @PostMapping("/register")
    public ResponseEntity<User> register(@Valid @RequestBody RegisterRequest registerRequest) {
        log.info("Attempting to register new user: {}", registerRequest.getUsername());
        User newUser = authService.registerNewUser(registerRequest);
        log.info("User {} registered successfully with ID: {}", newUser.getUsername(), newUser.getId());
        return new ResponseEntity<>(newUser, HttpStatus.CREATED);
    }
}