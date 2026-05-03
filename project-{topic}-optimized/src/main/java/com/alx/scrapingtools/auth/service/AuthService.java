package com.alx.scrapingtools.auth.service;

import com.alx.scrapingtools.auth.dto.AuthRequest;
import com.alx.scrapingtools.auth.dto.AuthResponse;
import com.alx.scrapingtools.auth.util.JwtUtil;
import com.alx.scrapingtools.user.model.User;
import com.alx.scrapingtools.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public User registerUser(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            user.setRoles("ROLE_USER"); // Default role
        }
        log.info("Registering user: {}", user.getUsername());
        return userRepository.save(user);
    }

    public AuthResponse authenticateUser(AuthRequest authRequest) {
        log.info("Attempting to authenticate user: {}", authRequest.getUsername());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream().map(Object::toString).toList();
        String token = jwtUtil.generateToken(userDetails.getUsername(), roles);
        log.info("User {} authenticated successfully.", authRequest.getUsername());
        return new AuthResponse(token);
    }
}