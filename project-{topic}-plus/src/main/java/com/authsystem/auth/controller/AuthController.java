package com.authsystem.auth.controller;

import com.authsystem.auth.dto.AuthRequest;
import com.authsystem.auth.dto.AuthResponse;
import com.authsystem.auth.dto.RegisterRequest;
import com.authsystem.auth.service.AuthService;
import com.authsystem.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for authentication-related operations.
 * This controller exposes endpoints for user registration and login.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    /**
     * Endpoint for user registration.
     * A new user is created with the provided details and assigned default roles.
     *
     * @param request The {@link RegisterRequest} containing the user's details.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the JWT token
     *         and a success message upon successful registration.
     *         Returns HTTP 201 Created.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Received registration request for username: {}", request.getUsername());
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(ApiResponse.success(
                HttpStatus.CREATED.value(),
                "User registered successfully",
                response,
                httpRequest.getRequestURI()
        ), HttpStatus.CREATED);
    }

    /**
     * Endpoint for user login.
     * Authenticates a user with the provided credentials and returns a JWT token.
     *
     * @param request The {@link AuthRequest} containing the user's login credentials.
     * @param httpRequest The {@link HttpServletRequest} to get the request path.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} with the JWT token
     *         and a success message upon successful login.
     *         Returns HTTP 200 OK.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody AuthRequest request,
            HttpServletRequest httpRequest
    ) {
        logger.info("Received login request for username: {}", request.getUsername());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(
                "User logged in successfully",
                response,
                httpRequest.getRequestURI()
        ));
    }
}