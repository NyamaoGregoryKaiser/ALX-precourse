```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.auth.AuthRequest;
import com.alx.scrapineer.api.dto.auth.AuthResponse;
import com.alx.scrapineer.api.dto.auth.RegisterRequest;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.security.UserPrincipal;
import com.alx.scrapineer.common.util.JwtUtil;
import com.alx.scrapineer.data.entity.Role;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Set;

/**
 * Service for user authentication and registration.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user with the provided details.
     * @param request The registration request containing username, password, and roles.
     * @return AuthResponse with JWT token and username.
     * @throws BadRequestException if the username already exists.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username " + request.getUsername() + " already exists.");
        }

        Set<Role> roles = request.getRoles();
        if (roles == null || roles.isEmpty()) {
            roles = Collections.singleton(Role.USER); // Default to USER role if none provided
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .build();

        userRepository.save(user);
        logger.info("User registered successfully: {}", user.getUsername());

        // Authenticate the newly registered user and generate a token
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        String jwtToken = jwtUtil.generateToken(userPrincipal);

        return AuthResponse.builder()
                .token(jwtToken)
                .username(user.getUsername())
                .build();
    }

    /**
     * Authenticates an existing user and generates a JWT token.
     * @param request The authentication request containing username and password.
     * @return AuthResponse with JWT token and username.
     * @throws org.springframework.security.authentication.BadCredentialsException if authentication fails.
     */
    public AuthResponse authenticate(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        String jwtToken = jwtUtil.generateToken(userPrincipal);
        logger.info("User authenticated successfully: {}", userPrincipal.getUsername());

        return AuthResponse.builder()
                .token(jwtToken)
                .username(userPrincipal.getUsername())
                .build();
    }
}
```