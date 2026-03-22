```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.config.JwtService;
import com.alx.ecommerce.dto.AuthDTOs;
import com.alx.ecommerce.exception.CustomAuthenticationException;
import com.alx.ecommerce.exception.DataIntegrityViolationException;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthDTOs.AuthenticationResponse register(AuthDTOs.RegisterRequest request) {
        log.info("Attempting to register new user: {}", request.getUsername());

        // Check for existing username or email to provide a more specific error
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DataIntegrityViolationException("Username '" + request.getUsername() + "' already exists.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DataIntegrityViolationException("Email '" + request.getEmail() + "' already exists.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(User.Role.CUSTOMER) // Default role for new registrations
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: {}", savedUser.getUsername());
        String jwtToken = jwtService.generateToken(savedUser);
        return AuthDTOs.AuthenticationResponse.builder()
                .token(jwtToken)
                .username(savedUser.getUsername())
                .role(savedUser.getRole().name())
                .build();
    }

    public AuthDTOs.AuthenticationResponse authenticate(AuthDTOs.AuthenticationRequest request) {
        log.info("Attempting to authenticate user with identifier: {}", request.getIdentifier());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getIdentifier(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            log.warn("Authentication failed for identifier {}: Invalid credentials", request.getIdentifier());
            throw new CustomAuthenticationException("Invalid username/email or password.");
        } catch (Exception e) {
            log.error("An error occurred during authentication for identifier {}: {}", request.getIdentifier(), e.getMessage());
            throw new CustomAuthenticationException("Authentication failed: " + e.getMessage(), e);
        }


        // Fetch user after successful authentication, supporting both username and email login
        User user = userRepository.findByUsername(request.getIdentifier())
                .or(() -> userRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new CustomAuthenticationException("User not found after successful authentication. This should not happen."));

        log.info("User authenticated successfully: {}", user.getUsername());
        String jwtToken = jwtService.generateToken(user);
        return AuthDTOs.AuthenticationResponse.builder()
                .token(jwtToken)
                .username(user.getUsername())
                .role(user.getRole().name())
                .build();
    }
}
```