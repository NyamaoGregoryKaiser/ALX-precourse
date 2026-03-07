```java
package com.ml.utilities.system.service;

import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.AuthResponse;
import com.ml.utilities.system.dto.UserDTO;
import com.ml.utilities.system.exception.InvalidCredentialsException;
import com.ml.utilities.system.exception.UserAlreadyExistsException;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.RoleRepository;
import com.ml.utilities.system.repository.UserRepository;
import com.ml.utilities.system.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new UserAlreadyExistsException("User with username '" + userDTO.getUsername() + "' already exists.");
        }
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new UserAlreadyExistsException("User with email '" + userDTO.getEmail() + "' already exists.");
        }

        User user = new User();
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));

        Set<Role> roles = new HashSet<>();
        if (userDTO.getRoles() != null && !userDTO.getRoles().isEmpty()) {
            roles = userDTO.getRoles().stream()
                    .map(roleName -> roleRepository.findByName(roleName.toUpperCase())
                            .orElseGet(() -> {
                                log.warn("Role '{}' not found, creating new role.", roleName.toUpperCase());
                                return roleRepository.save(new Role(roleName.toUpperCase()));
                            }))
                    .collect(Collectors.toSet());
        } else {
            // Assign default 'USER' role if no roles are provided
            Role userRole = roleRepository.findByName("USER")
                    .orElseGet(() -> {
                        log.warn("Default 'USER' role not found, creating it.");
                        return roleRepository.save(new Role("USER"));
                    });
            roles.add(userRole);
        }
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        log.info("Registered new user: {}", savedUser.getUsername());

        // Generate token immediately after registration
        String token = jwtService.generateToken(savedUser.getUsername());
        return new AuthResponse(token, "User registered successfully!");
    }

    public AuthResponse login(AuthRequest authRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword())
            );
            if (authentication.isAuthenticated()) {
                String token = jwtService.generateToken(authRequest.getUsername());
                return new AuthResponse(token, "Authentication successful!");
            } else {
                throw new InvalidCredentialsException("Invalid username or password.");
            }
        } catch (UsernameNotFoundException e) {
            log.warn("Authentication failed: User not found - {}", authRequest.getUsername());
            throw new InvalidCredentialsException("Invalid username or password.");
        } catch (org.springframework.security.core.AuthenticationException e) {
            log.warn("Authentication failed for user {}: {}", authRequest.getUsername(), e.getMessage());
            throw new InvalidCredentialsException("Invalid username or password.");
        }
    }
}
```