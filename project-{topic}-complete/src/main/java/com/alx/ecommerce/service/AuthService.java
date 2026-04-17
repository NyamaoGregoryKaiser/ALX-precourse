package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.auth.JwtAuthResponse;
import com.alx.ecommerce.dto.auth.LoginRequest;
import com.alx.ecommerce.dto.auth.RegisterRequest;
import com.alx.ecommerce.exception.CustomAuthenticationException;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.Role;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.RoleRepository;
import com.alx.ecommerce.repository.UserRepository;
import com.alx.ecommerce.security.JwtTokenProvider;
import com.alx.ecommerce.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

/**
 * Service for user authentication and registration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Registers a new user with default 'ROLE_USER'.
     *
     * @param request The registration request DTO.
     * @return A message indicating successful registration.
     * @throws IllegalArgumentException if username or email already exists.
     */
    @Transactional
    public String registerUser(RegisterRequest request) {
        log.info("Attempting to register user: {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username {} already exists.", request.getUsername());
            throw new IllegalArgumentException("Username is already taken!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: Email {} already exists.", request.getEmail());
            throw new IllegalArgumentException("Email is already registered!");
        }

        // Create new user's account
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        Role roles = roleRepository.findByName(AppConstants.ROLE_USER)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", AppConstants.ROLE_USER));
        user.setRoles(Collections.singleton(roles));

        userRepository.save(user);
        log.info("User {} registered successfully.", user.getUsername());
        return "User registered successfully!";
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * @param request The login request DTO.
     * @return JwtAuthResponse containing the JWT token and user details.
     * @throws CustomAuthenticationException if authentication fails.
     */
    public JwtAuthResponse loginUser(LoginRequest request) {
        log.info("Attempting to login user: {}", request.getUsernameOrEmail());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsernameOrEmail(),
                            request.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String token = jwtTokenProvider.generateToken(authentication);
            User user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "usernameOrEmail", request.getUsernameOrEmail()));

            log.info("User {} logged in successfully.", user.getUsername());

            return JwtAuthResponse.builder()
                    .accessToken(token)
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRoles().stream().findFirst().orElseThrow().getName()) // Assuming one primary role for simplicity in DTO
                    .build();

        } catch (BadCredentialsException e) {
            log.warn("Authentication failed for user {}: Invalid credentials.", request.getUsernameOrEmail());
            throw new CustomAuthenticationException("Invalid username/email or password.");
        } catch (Exception e) {
            log.error("An unexpected error occurred during login for user {}: {}", request.getUsernameOrEmail(), e.getMessage());
            throw new CustomAuthenticationException("An error occurred during authentication.");
        }
    }
}