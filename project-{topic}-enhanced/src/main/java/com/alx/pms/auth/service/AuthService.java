```java
package com.alx.pms.auth.service;

import com.alx.pms.auth.dto.AuthRequest;
import com.alx.pms.auth.dto.AuthResponse;
import com.alx.pms.exception.UnauthorizedException;
import com.alx.pms.exception.ValidationException;
import com.alx.pms.model.User;
import com.alx.pms.security.JwtService;
import com.alx.pms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(AuthRequest request) {
        log.info("Attempting to register new user: {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ValidationException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ValidationException("Email is already registered");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        User savedUser = userRepository.save(user);

        String jwtToken = jwtService.generateToken(savedUser);
        log.info("User registered successfully: {}", savedUser.getUsername());
        return new AuthResponse(jwtToken, savedUser.getUsername(), savedUser.getId(), "Registration successful");
    }

    @Transactional
    @CachePut(value = "users", key = "#result.id") // Update cache after successful login
    public AuthResponse login(AuthRequest request) {
        log.info("Attempting to log in user: {}", request.getUsername());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            log.warn("Authentication failed for user {}: {}", request.getUsername(), e.getMessage());
            throw new UnauthorizedException("Invalid username or password");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.error("User not found after successful authentication (unexpected): {}", request.getUsername());
                    return new UnauthorizedException("User not found");
                });

        String jwtToken = jwtService.generateToken(user);
        log.info("User logged in successfully: {}", user.getUsername());
        return new AuthResponse(jwtToken, user.getUsername(), user.getId(), "Login successful");
    }

    @CacheEvict(value = "users", key = "#userId") // Evict user from cache on logout (if implemented on frontend)
    public void logout(Long userId) {
        log.info("User {} logged out (cache evicted)", userId);
        // In a JWT-based system, logout primarily means discarding the token on the client side.
        // Server-side logout can involve invalidating the token (e.g., adding to a blacklist/revocation list),
        // but for simplicity and statelessness, we're just noting cache eviction here.
    }
}
```