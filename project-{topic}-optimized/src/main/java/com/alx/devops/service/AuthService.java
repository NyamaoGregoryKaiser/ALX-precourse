package com.alx.devops.service;

import com.alx.devops.config.JwtTokenProvider;
import com.alx.devops.dto.AuthRequest;
import com.alx.devops.dto.AuthResponse;
import com.alx.devops.model.Role;
import com.alx.devops.model.RoleName;
import com.alx.devops.model.User;
import com.alx.devops.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

/**
 * Service for handling user authentication and registration.
 * Manages user creation, password hashing, and JWT token generation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    /**
     * Authenticates a user and generates a JWT token upon successful login.
     *
     * @param authRequest Contains username/email and password for authentication.
     * @return AuthResponse containing the JWT token.
     */
    public AuthResponse authenticateUser(AuthRequest authRequest) {
        log.info("Attempting to authenticate user: {}", authRequest.getUsername());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRequest.getUsername(),
                        authRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        log.info("User {} authenticated successfully.", authRequest.getUsername());
        return new AuthResponse(jwt);
    }

    /**
     * Registers a new user with default ROLE_USER.
     *
     * @param authRequest Contains username, email, and password for registration.
     * @return The registered User object.
     * @throws IllegalArgumentException if username or email already exists.
     */
    @Transactional
    public User registerUser(AuthRequest authRequest) {
        log.info("Attempting to register new user: {}", authRequest.getUsername());
        if (userRepository.existsByUsername(authRequest.getUsername())) {
            log.warn("Username {} already exists.", authRequest.getUsername());
            throw new IllegalArgumentException("Username is already taken!");
        }

        if (userRepository.existsByEmail(authRequest.getEmail())) {
            log.warn("Email {} already in use.", authRequest.getEmail());
            throw new IllegalArgumentException("Email Address already in use!");
        }

        // Creating user's account
        User user = User.builder()
                .username(authRequest.getUsername())
                .email(authRequest.getEmail())
                .password(passwordEncoder.encode(authRequest.getPassword()))
                .build();

        // Assign default role (e.g., ROLE_USER)
        Set<Role> roles = new HashSet<>();
        roles.add(new Role(RoleName.ROLE_USER)); // Assuming Role entities are managed elsewhere or directly created
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        log.info("User {} registered successfully.", savedUser.getUsername());
        return savedUser;
    }
}