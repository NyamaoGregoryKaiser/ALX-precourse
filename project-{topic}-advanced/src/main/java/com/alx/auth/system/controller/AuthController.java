package com.alx.auth.system.controller;

import com.alx.auth.system.data.dto.AuthenticationRequest;
import com.alx.auth.system.data.dto.AuthenticationResponse;
import com.alx.auth.system.data.dto.RegisterRequest;
import com.alx.auth.system.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for user authentication operations such as registration and login.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments (final fields).
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 * @Tag: Swagger annotation for API grouping.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "API for user registration and login")
public class AuthController {

    private final AuthService authService;

    /**
     * Handles user registration.
     *
     * @param request The registration request containing user details.
     * @return ResponseEntity with an AuthenticationResponse containing JWT token upon successful registration.
     */
    @Operation(summary = "Register a new user",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User registered successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = AuthenticationResponse.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid input or user already exists"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        log.info("Attempting to register new user with email: {}", request.getEmail());
        AuthenticationResponse response = authService.register(request);
        log.info("User registered successfully with email: {}", request.getEmail());
        return ResponseEntity.ok(response);
    }

    /**
     * Handles user login and authentication.
     *
     * @param request The authentication request containing user credentials.
     * @return ResponseEntity with an AuthenticationResponse containing JWT token upon successful login.
     */
    @Operation(summary = "Authenticate an existing user",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User authenticated successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = AuthenticationResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Invalid credentials"),
                    @ApiResponse(responseCode = "400", description = "Invalid input"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @Valid @RequestBody AuthenticationRequest request
    ) {
        log.info("Attempting to authenticate user with email: {}", request.getEmail());
        AuthenticationResponse response = authService.authenticate(request);
        log.info("User authenticated successfully with email: {}", request.getEmail());
        return ResponseEntity.ok(response);
    }

    /**
     * Handles token refresh. In a real-world scenario, this might involve refresh tokens.
     * For this basic implementation, it re-issues a new token if the provided token is valid
     * but nearing expiry, or a refresh token is used.
     *
     * NOTE: This is a placeholder. A robust refresh token mechanism typically involves
     * storing and validating refresh tokens server-side, not just re-issuing JWT based on an old one.
     *
     * @param request The authentication request (can be simplified to just a refresh token in real apps).
     * @return ResponseEntity with a new AuthenticationResponse containing updated JWT.
     */
    @Operation(summary = "Refresh JWT token (placeholder)",
            description = "Note: This is a simplified placeholder. A robust refresh token implementation " +
                    "would involve refresh tokens stored server-side.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Token refreshed successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = AuthenticationResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Invalid or expired token"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthenticationResponse> refreshToken(
            // In a real application, this would typically take a refresh token, not user credentials
            // For simplicity, we'll re-authenticate with existing credentials
            @Valid @RequestBody AuthenticationRequest request
    ) {
        log.info("Attempting to refresh token for user: {}", request.getEmail());
        // A robust refresh mechanism would look different. This is a simplified re-authenticate.
        AuthenticationResponse response = authService.authenticate(request);
        log.info("Token refreshed successfully for user: {}", request.getEmail());
        return ResponseEntity.ok(response);
    }
}