package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.auth.JwtAuthResponse;
import com.alx.ecommerce.dto.auth.LoginRequest;
import com.alx.ecommerce.dto.auth.RegisterRequest;
import com.alx.ecommerce.dto.MessageResponse;
import com.alx.ecommerce.service.AuthService;
import com.alx.ecommerce.util.AppConstants;
import io.swagger.v3.oas.annotations.Operation;
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
 */
@Tag(name = "Authentication & Authorization", description = "User registration, login, and JWT token management.")
@RestController
@RequestMapping(AppConstants.API_V1_BASE_URL + "/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Handles user login and provides a JWT token.
     *
     * @param loginRequest DTO containing username/email and password.
     * @return ResponseEntity with JwtAuthResponse and HTTP status OK.
     */
    @Operation(summary = "User Login",
            description = "Authenticates a user with username/email and password, returning a JWT token.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Login successful", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = JwtAuthResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Invalid Credentials", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = MessageResponse.class)))
            })
    @PostMapping("/login")
    public ResponseEntity<JwtAuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthResponse response = authService.loginUser(loginRequest);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    /**
     * Handles user registration.
     *
     * @param registerRequest DTO containing new user details.
     * @return ResponseEntity with a success message and HTTP status CREATED.
     */
    @Operation(summary = "User Registration",
            description = "Registers a new user account with default 'ROLE_USER'.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Registration successful", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = MessageResponse.class))),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., username/email already exists, validation errors)", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = MessageResponse.class)))
            })
    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        String message = authService.registerUser(registerRequest);
        return new ResponseEntity<>(new MessageResponse(message, HttpStatus.CREATED.value()), HttpStatus.CREATED);
    }
}