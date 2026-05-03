package com.mlutil.ml_utilities_system.service;

import com.mlutil.ml_utilities_system.dto.auth.RegisterRequest;
import com.mlutil.ml_utilities_system.exception.UserAlreadyExistsException;
import com.mlutil.ml_utilities_system.model.Role;
import com.mlutil.ml_utilities_system.model.User;
import com.mlutil.ml_utilities_system.repository.RoleRepository;
import com.mlutil.ml_utilities_system.repository.UserRepository;
import com.mlutil.ml_utilities_system.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public User registerNewUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already in use: " + request.getEmail());
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> {
                    Role newRole = Role.builder().name("ROLE_USER").build();
                    return roleRepository.save(newRole);
                });

        User newUser = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(new HashSet<>(Collections.singletonList(userRole)))
                .build();

        log.info("Registering user: {}", newUser.getUsername());
        return userRepository.save(newUser);
    }

    public String authenticateAndGetToken(String username, String password) {
        log.debug("Authenticating user: {}", username);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );
        // If authentication is successful, generate JWT
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return jwtUtil.generateToken(userDetails);
    }
}