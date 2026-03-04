package com.authsystem.auth.service;

import com.authsystem.auth.dto.AuthRequest;
import com.authsystem.auth.dto.AuthResponse;
import com.authsystem.auth.dto.RegisterRequest;
import com.authsystem.auth.util.JwtService;
import com.authsystem.common.exception.ResourceNotFoundException;
import com.authsystem.common.exception.ValidationException;
import com.authsystem.common.util.RoleEnum;
import com.authsystem.model.Role;
import com.authsystem.model.User;
import com.authsystem.repository.RoleRepository;
import com.authsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/**
 * Service class responsible for user authentication and registration.
 * It handles the business logic for creating new users,
 * authenticating existing users, and generating JWT tokens.
 *
 * {@code @RequiredArgsConstructor} generates a constructor for final fields,
 * allowing for constructor injection of dependencies.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user in the system.
     *
     * 1. Validates if the username or email already exists.
     * 2. Encodes the user's password using BCrypt.
     * 3. Assigns the default "ROLE_USER" to the new user.
     * 4. Saves the new user to the database.
     * 5. Generates a JWT token for the newly registered user.
     *
     * This method is transactional to ensure data consistency.
     *
     * @param request The {@link RegisterRequest} containing user registration details.
     * @return An {@link AuthResponse} containing the generated JWT token and a success message.
     * @throws ValidationException If the username or email already exists, or if the default role is not found.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        logger.info("Attempting to register new user with username: {}", request.getUsername());

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            logger.warn("Registration failed: Username '{}' already exists.", request.getUsername());
            throw new ValidationException("Username '" + request.getUsername() + "' is already taken.", "username_taken");
        }
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            logger.warn("Registration failed: Email '{}' already registered.", request.getEmail());
            throw new ValidationException("Email '" + request.getEmail() + "' is already registered.", "email_taken");
        }

        // Find the default user role (ROLE_USER)
        Role userRole = roleRepository.findByName(RoleEnum.ROLE_USER.getRoleName())
                .orElseThrow(() -> {
                    logger.error("Registration failed: Default role {} not found.", RoleEnum.ROLE_USER.getRoleName());
                    return new ResourceNotFoundException("Default user role not found. Please contact support.", "role_not_found");
                });

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);

        // Build and save the new user
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Encode password
                .roles(roles)
                .enabled(true)
                .accountNonExpired(true)
                .accountNonLocked(true)
                .credentialsNonExpired(true)
                .build();

        userRepository.save(user);
        logger.info("User '{}' registered successfully.", user.getUsername());

        // Generate JWT token for the new user
        String jwtToken = jwtService.generateToken(user);
        logger.debug("JWT token generated for new user: {}", user.getUsername());

        return AuthResponse.builder()
                .token(jwtToken)
                .message("User registered successfully. Welcome!")
                .build();
    }

    /**
     * Authenticates an existing user and generates a JWT token upon successful login.
     *
     * 1. Attempts to authenticate the user using Spring Security's {@link AuthenticationManager}.
     * 2. If authentication is successful, loads the user details and generates a JWT token.
     * 3. Sets the authenticated user in the {@link SecurityContextHolder}.
     *
     * @param request The {@link AuthRequest} containing user login credentials.
     * @return An {@link AuthResponse} containing the generated JWT token and a success message.
     * @throws BadCredentialsException If authentication fails (invalid username/email or password).
     */
    @Transactional(readOnly = true) // Login is a read-only operation
    public AuthResponse login(AuthRequest request) {
        logger.info("Attempting to log in user: {}", request.getUsername());

        try {
            // Authenticate user using Spring Security's AuthenticationManager
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
            // If authentication is successful, set the Authentication object in the SecurityContext
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Load user details to generate JWT
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // Generate JWT token
            String jwtToken = jwtService.generateToken(userDetails);
            logger.info("User '{}' logged in successfully. JWT token generated.", request.getUsername());

            return AuthResponse.builder()
                    .token(jwtToken)
                    .message("Login successful. Welcome back!")
                    .build();
        } catch (BadCredentialsException ex) {
            logger.warn("Login failed for user '{}': Invalid credentials.", request.getUsername());
            throw new BadCredentialsException("Invalid username or password.");
        } catch (Exception ex) {
            logger.error("An unexpected error occurred during login for user '{}': {}", request.getUsername(), ex.getMessage(), ex);
            throw new RuntimeException("An unexpected error occurred during login. Please try again later.");
        }
    }
}