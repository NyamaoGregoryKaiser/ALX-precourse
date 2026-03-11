package com.alx.ecommerce.user.controller;

import com.alx.ecommerce.common.ApiResponse;
import com.alx.ecommerce.user.dto.LoginRequest;
import com.alx.ecommerce.user.dto.JwtResponse;
import com.alx.ecommerce.user.dto.SignupRequest;
import com.alx.ecommerce.user.dto.UserDTO;
import com.alx.ecommerce.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & User Management", description = "API for user registration, login, and profile management")
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    @Operation(summary = "Register a new user", description = "Creates a new user account with default 'ROLE_USER'.")
    public ResponseEntity<ApiResponse<UserDTO>> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        UserDTO user = userService.registerUser(signUpRequest);
        return new ResponseEntity<>(new ApiResponse<>(true, "User registered successfully!", user), HttpStatus.CREATED);
    }

    @PostMapping("/signin")
    @Operation(summary = "Authenticate user and get JWT token", description = "Logs in a user and returns a JWT token for subsequent authenticated requests.")
    public ResponseEntity<ApiResponse<JwtResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = userService.authenticateUser(loginRequest);
        return new ResponseEntity<>(new ApiResponse<>(true, "User authenticated successfully!", jwtResponse), HttpStatus.OK);
    }

    @GetMapping("/user/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Operation(summary = "Get user details by ID", description = "Retrieves details of a specific user by their ID. Requires USER or ADMIN role.")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable Long id) {
        UserDTO userDTO = userService.getUserById(id);
        return new ResponseEntity<>(new ApiResponse<>(true, "User fetched successfully", userDTO), HttpStatus.OK);
    }
}