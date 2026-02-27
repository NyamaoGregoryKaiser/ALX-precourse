```java
package com.alx.webscraper.auth.controller;

import com.alx.webscraper.auth.config.JwtService;
import com.alx.webscraper.auth.model.AuthRequest;
import com.alx.webscraper.auth.model.AuthResponse;
import com.alx.webscraper.auth.model.Role;
import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * REST Controller for user authentication and registration.
 * Provides endpoints for user signup and login.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "User registration and login API")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Autowired
    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Registers a new user in the system.
     *
     * @param request The AuthRequest DTO containing username, email, and password.
     * @return A ResponseEntity with the generated JWT token and user details upon successful registration.
     */
    @PostMapping("/register")
    @Operation(summary = "Register a new user",
               responses = {
                   @ApiResponse(responseCode = "201", description = "User registered successfully",
                                content = @Content(schema = @Schema(implementation = AuthResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or password too weak"),
                   @ApiResponse(responseCode = "409", description = "Username or email already exists")
               })
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody AuthRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return new ResponseEntity<>(AuthResponse.builder().message("Username already taken!").build(), HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            return new ResponseEntity<>(AuthResponse.builder().message("Email already registered!").build(), HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER) // Default role for new registrations
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        // Auto-login after registration
        String jwtToken = jwtService.generateToken(user);
        return new ResponseEntity<>(AuthResponse.builder()
                .token(jwtToken)
                .username(user.getUsername())
                .role(user.getRole())
                .message("User registered and logged in successfully!")
                .build(), HttpStatus.CREATED);
    }

    /**
     * Authenticates a user and provides a JWT token.
     *
     * @param request The AuthRequest DTO containing username and password.
     * @return A ResponseEntity with the generated JWT token upon successful authentication.
     */
    @PostMapping("/login")
    @Operation(summary = "Authenticate user and get JWT token",
               responses = {
                   @ApiResponse(responseCode = "200", description = "User authenticated successfully",
                                content = @Content(schema = @Schema(implementation = AuthResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Invalid username or password")
               })
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody AuthRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            // If authentication is successful, generate JWT
            if (authentication.isAuthenticated()) {
                User userDetails = (User) authentication.getPrincipal();
                String jwtToken = jwtService.generateToken(userDetails);
                return ResponseEntity.ok(AuthResponse.builder()
                        .token(jwtToken)
                        .username(userDetails.getUsername())
                        .role(userDetails.getRole())
                        .message("Login successful!")
                        .build());
            } else {
                // This block should theoretically not be reached as authenticate() throws exception for failure
                return new ResponseEntity<>(AuthResponse.builder().message("Authentication failed!").build(), HttpStatus.UNAUTHORIZED);
            }
        } catch (BadCredentialsException e) {
            // Specific handling for bad credentials
            return new ResponseEntity<>(AuthResponse.builder().message("Invalid username or password!").build(), HttpStatus.UNAUTHORIZED);
        } catch (Exception e) {
            // General error during authentication
            return new ResponseEntity<>(AuthResponse.builder().message("An error occurred during authentication: " + e.getMessage()).build(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
```