package com.alx.auth.system.service;

import com.alx.auth.system.data.dto.AuthenticationRequest;
import com.alx.auth.system.data.dto.AuthenticationResponse;
import com.alx.auth.system.data.dto.RegisterRequest;
import com.alx.auth.system.data.entity.Role;
import com.alx.auth.system.data.entity.User;
import com.alx.auth.system.data.repository.UserRepository;
import com.alx.auth.system.exception.DuplicateUserException;
import com.alx.auth.system.exception.InvalidCredentialsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service class responsible for handling user authentication and registration logic.
 * This includes creating new user accounts, authenticating existing users, and issuing JWT tokens.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments (final fields).
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user in the system.
     *
     * @param request The RegisterRequest containing user details (firstname, lastname, email, password).
     * @return An AuthenticationResponse containing the JWT token for the newly registered user.
     * @throws DuplicateUserException if a user with the provided email already exists.
     */
    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        // 1. Check if user with given email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: User with email {} already exists.", request.getEmail());
            throw new DuplicateUserException("User with email " + request.getEmail() + " already exists.");
        }

        // 2. Build new User entity
        User user = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Hash the password
                .role(Role.USER) // Assign default USER role
                .build();

        // 3. Save the new user to the database
        User savedUser = userRepository.save(user);
        log.info("User registered successfully: {}", savedUser.getEmail());

        // 4. Generate JWT token for the new user
        String jwtToken = jwtService.generateToken(savedUser);

        // 5. Return the authentication response
        return AuthenticationResponse.builder()
                .token(jwtToken)
                .build();
    }

    /**
     * Authenticates an existing user.
     *
     * @param request The AuthenticationRequest containing user credentials (email, password).
     * @return An AuthenticationResponse containing the JWT token upon successful authentication.
     * @throws InvalidCredentialsException if authentication fails (e.g., wrong password).
     */
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            // 1. Authenticate user using Spring Security's AuthenticationManager
            // This will throw BadCredentialsException if authentication fails.
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            // 2. Retrieve UserDetails from the authenticated principal
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // 3. Generate JWT token
            String jwtToken = jwtService.generateToken(userDetails);
            log.info("User {} authenticated successfully.", userDetails.getUsername());

            // 4. Return the authentication response
            return AuthenticationResponse.builder()
                    .token(jwtToken)
                    .build();
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.warn("Authentication failed for user {}: Invalid credentials.", request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password.");
        } catch (Exception e) {
            log.error("An unexpected error occurred during authentication for user {}: {}", request.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Authentication failed due to an internal error.");
        }
    }
}