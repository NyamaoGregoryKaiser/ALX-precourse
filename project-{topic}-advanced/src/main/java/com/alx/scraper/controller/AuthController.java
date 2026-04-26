package com.alx.scraper.controller;

import com.alx.scraper.dto.JwtResponse;
import com.alx.scraper.dto.LoginRequest;
import com.alx.scraper.dto.UserDTO;
import com.alx.scraper.model.User;
import com.alx.scraper.security.JwtUtil;
import com.alx.scraper.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for user authentication and registration.
 * Provides endpoints for creating new user accounts and logging in.
 *
 * ALX Focus: Handles user authentication, demonstrating the use of Spring Security
 * for user validation and JWT for token generation. Essential for securing the API.
 * Includes Swagger annotations for clear API documentation.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User registration and login operations")
@Slf4j
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Registers a new user.
     *
     * @param userDTO The {@link UserDTO} containing username and password.
     * @return A {@link ResponseEntity} with a success message or error.
     */
    @Operation(summary = "Register a new user",
               responses = {
                   @ApiResponse(responseCode = "201", description = "User registered successfully",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = User.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input data",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = GlobalExceptionHandler.ErrorResponse.class))),
                   @ApiResponse(responseCode = "409", description = "Username already exists",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = GlobalExceptionHandler.ErrorResponse.class)))
               })
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody UserDTO userDTO) {
        User user = userService.registerNewUser(userDTO);
        return new ResponseEntity<>("User registered successfully: " + user.getUsername(), HttpStatus.CREATED);
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * @param loginRequest The {@link LoginRequest} containing username and password.
     * @return A {@link ResponseEntity} with a {@link JwtResponse} containing the token.
     */
    @Operation(summary = "Authenticate user and get JWT token",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Login successful, returns JWT token",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = JwtResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Invalid credentials",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = GlobalExceptionHandler.ErrorResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input data",
                                content = @Content(mediaType = "application/json",
                                                   schema = @Schema(implementation = GlobalExceptionHandler.ErrorResponse.class)))
               })
    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("Attempting to authenticate user: {}", loginRequest.getUsername());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtil.generateJwtToken(authentication);

        log.info("User {} authenticated successfully. JWT generated.", loginRequest.getUsername());
        return ResponseEntity.ok(new JwtResponse(jwt));
    }
}