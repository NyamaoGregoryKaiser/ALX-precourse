```java
package com.alx.pm.controller;

import com.alx.pm.dto.JwtResponse;
import com.alx.pm.dto.LoginRequest;
import com.alx.pm.dto.RegisterRequest;
import com.alx.pm.service.AuthService;
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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User registration and login API")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a new user",
               responses = {
                   @ApiResponse(responseCode = "201", description = "User registered successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input or username already exists")
               })
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.registerUser(registerRequest);
        return new ResponseEntity<>("User registered successfully!", HttpStatus.CREATED);
    }

    @Operation(summary = "Authenticate user and get JWT token",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Login successful, JWT token returned"),
                   @ApiResponse(responseCode = "401", description = "Invalid credentials")
               })
    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        String jwt = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(new JwtResponse(jwt));
    }
}
```