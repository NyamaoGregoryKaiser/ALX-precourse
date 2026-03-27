```java
package com.ml.utilities.controller;

import com.ml.utilities.dto.AuthRequest;
import com.ml.utilities.dto.AuthResponse;
import com.ml.utilities.entity.User;
import com.ml.utilities.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and registration APIs")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a new user (admin role required for non-default roles)",
               description = "Registers a new user. By default, registers as a 'USER'. " +
                             "Admins can register other admins.")
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody AuthRequest request) {
        // For simplicity, always register as USER unless an admin endpoint is specifically hit
        // In a real app, perhaps a separate admin endpoint or a dynamic role assignment
        try {
            authService.registerUser(request, Set.of("ROLE_USER"));
            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @Operation(summary = "Register a new admin user (requires existing admin role)",
               description = "Registers a new user with 'ADMIN' role. Only users with 'ADMIN' role can access this.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/register")
    public ResponseEntity<String> registerAdmin(@Valid @RequestBody AuthRequest request) {
        try {
            authService.registerUser(request, Set.of("ROLE_USER", "ROLE_ADMIN"));
            return ResponseEntity.status(HttpStatus.CREATED).body("Admin user registered successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @Operation(summary = "Authenticate user and get JWT token",
               description = "Authenticates a user with username and password, returning a JWT token for subsequent requests.")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody AuthRequest request) {
        String token = authService.loginUser(request);
        return ResponseEntity.ok(new AuthResponse(token));
    }
}
```