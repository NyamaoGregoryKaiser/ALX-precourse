```java
package com.alx.vizflow.controller;

import com.alx.vizflow.dto.AuthRequest;
import com.alx.vizflow.dto.AuthResponse;
import com.alx.vizflow.dto.UserRegistrationRequest;
import com.alx.vizflow.exception.UserAlreadyExistsException;
import com.alx.vizflow.model.User;
import com.alx.vizflow.service.JwtService;
import com.alx.vizflow.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    public AuthController(UserService userService, JwtService jwtService,
                          AuthenticationManager authenticationManager, UserDetailsService userDetailsService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody UserRegistrationRequest registrationRequest) {
        try {
            User registeredUser = userService.registerNewUser(registrationRequest);
            log.info("User registered successfully: {}", registeredUser.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully!");
        } catch (UserAlreadyExistsException e) {
            log.warn("Registration failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error during user registration: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed due to an unexpected error.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest authRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword()));

            UserDetails userDetails = userDetailsService.loadUserByUsername(authRequest.getUsername());
            String token = jwtService.generateToken(userDetails);
            String role = userDetails.getAuthorities().stream()
                                     .map(Object::toString)
                                     .collect(Collectors.joining(", ")); // Example: "ROLE_USER, ROLE_ADMIN"

            log.info("User {} logged in successfully.", authRequest.getUsername());
            return ResponseEntity.ok(new AuthResponse(token, authRequest.getUsername(), role));
        } catch (BadCredentialsException e) {
            log.warn("Login failed for user {}: Invalid credentials.", authRequest.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password.");
        } catch (Exception e) {
            log.error("Error during user login for {}: {}", authRequest.getUsername(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred during login.");
        }
    }
}
```