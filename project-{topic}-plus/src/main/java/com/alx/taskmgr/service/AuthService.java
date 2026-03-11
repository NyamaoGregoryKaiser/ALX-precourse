```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.auth.AuthRequest;
import com.alx.taskmgr.dto.auth.AuthResponse;
import com.alx.taskmgr.dto.auth.RegisterRequest;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.DuplicateResourceException;
import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Service class for user authentication and registration.
 * Handles business logic for creating new users and authenticating existing ones.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user with the provided details.
     * Assigns 'ROLE_USER' by default. Checks for existing email to prevent duplicates.
     *
     * @param request The RegisterRequest containing user registration data.
     * @return An AuthResponse containing a JWT token for the newly registered user.
     * @throws DuplicateResourceException If a user with the given email already exists.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if user with given email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User with email " + request.getEmail() + " already exists.");
        }

        // Build new user entity
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Encode password before saving
                .roles(Set.of(Role.ROLE_USER)) // Assign default role
                .build();

        userRepository.save(user);

        // Generate JWT token for the new user
        String jwtToken = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(jwtToken)
                .build();
    }

    /**
     * Authenticates a user with the provided credentials.
     * If authentication is successful, a new JWT token is generated.
     *
     * @param request The AuthRequest containing user login credentials.
     * @return An AuthResponse containing a JWT token for the authenticated user.
     * @throws BadCredentialsException If authentication fails (invalid email/password).
     */
    public AuthResponse authenticate(AuthRequest request) {
        // Authenticate user using Spring Security's AuthenticationManager
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // If authentication is successful, retrieve user and generate JWT token
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("User not found after authentication success (this should not happen)")); // Should not happen if authenticate() succeeds

        String jwtToken = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(jwtToken)
                .build();
    }
}
```