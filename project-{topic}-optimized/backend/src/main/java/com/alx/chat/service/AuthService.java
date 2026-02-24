```java
package com.alx.chat.service;

import com.alx.chat.dto.AuthRequest;
import com.alx.chat.dto.AuthResponse;
import com.alx.chat.dto.RegisterRequest;
import com.alx.chat.entity.User;
import com.alx.chat.exception.UserAlreadyExistsException;
import com.alx.chat.repository.UserRepository;
import com.alx.chat.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for user authentication and registration.
 * Handles business logic related to user accounts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Registers a new user in the system.
     * @param request RegisterRequest containing username, email, and password.
     * @return AuthResponse with JWT token for the newly registered user.
     * @throws UserAlreadyExistsException if username or email already exists.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration attempt with existing username: {}", request.getUsername());
            throw new UserAlreadyExistsException("Username '" + request.getUsername() + "' is already taken.");
        }
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration attempt with existing email: {}", request.getEmail());
            throw new UserAlreadyExistsException("Email '" + request.getEmail() + "' is already registered.");
        }

        // Create new user entity
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Hash the password
                .build();

        userRepository.save(user);
        log.info("User {} registered successfully.", user.getUsername());

        // Authenticate the newly registered user and generate a token
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .accessToken(jwt)
                .username(user.getUsername())
                .build();
    }

    /**
     * Authenticates an existing user.
     * @param request AuthRequest containing username and password.
     * @return AuthResponse with JWT token for the authenticated user.
     */
    public AuthResponse login(AuthRequest request) {
        // Authenticate user credentials
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        // Set the authentication in the SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);
        log.info("User {} authenticated successfully.", authentication.getName());

        // Generate JWT token
        String jwt = jwtTokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .accessToken(jwt)
                .username(authentication.getName())
                .build();
    }
}
```