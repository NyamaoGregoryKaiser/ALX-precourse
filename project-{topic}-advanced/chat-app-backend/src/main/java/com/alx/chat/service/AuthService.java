```java
package com.alx.chat.service;

import com.alx.chat.dto.auth.AuthenticationRequest;
import com.alx.chat.dto.auth.AuthenticationResponse;
import com.alx.chat.dto.auth.RegisterRequest;
import com.alx.chat.entity.Role;
import com.alx.chat.entity.User;
import com.alx.chat.exception.UserAlreadyExistsException;
import com.alx.chat.repository.UserRepository;
import com.alx.chat.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    @CacheEvict(value = "users", key = "#request.username") // Clear cache for new user
    public AuthenticationResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Collections.singleton(Role.USER)) // Default role USER
                .build();
        userRepository.save(user);
        var jwtToken = jwtUtil.generateToken(user);
        return AuthenticationResponse.builder().token(jwtToken).build();
    }

    @Transactional(readOnly = true)
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.password
                )
        );
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UserAlreadyExistsException("User not found")); // Should not happen after authenticate

        var jwtToken = jwtUtil.generateToken(user);
        return AuthenticationResponse.builder().token(jwtToken).build();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#username", unless = "#result == null") // Cache user details
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
}
```