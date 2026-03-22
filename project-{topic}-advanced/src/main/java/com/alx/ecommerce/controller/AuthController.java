```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.AuthDTOs;
import com.alx.ecommerce.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User registration and login management")
@Slf4j
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a new user",
               description = "Registers a new user account with CUSTOMER role and returns a JWT token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User successfully registered and authenticated",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuthDTOs.AuthenticationResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid input or validation error",
                         content = @Content),
            @ApiResponse(responseCode = "409", description = "Username or email already exists",
                         content = @Content)
    })
    @PostMapping("/register")
    public ResponseEntity<AuthDTOs.AuthenticationResponse> register(@Valid @RequestBody AuthDTOs.RegisterRequest request) {
        log.info("Received registration request for user: {}", request.getUsername());
        AuthDTOs.AuthenticationResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @Operation(summary = "Authenticate user and get JWT token",
               description = "Authenticates an existing user with username/email and password, returning a JWT token for subsequent requests.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User successfully authenticated",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = AuthDTOs.AuthenticationResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload",
                         content = @Content),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                         content = @Content)
    })
    @PostMapping("/authenticate")
    public ResponseEntity<AuthDTOs.AuthenticationResponse> authenticate(@Valid @RequestBody AuthDTOs.AuthenticationRequest request) {
        log.info("Received authentication request for identifier: {}", request.getIdentifier());
        AuthDTOs.AuthenticationResponse response = authService.authenticate(request);
        return ResponseEntity.ok(response);
    }
}
```