```java
package com.ml_utils_system.service;

import com.ml_utils_system.config.JwtUtils;
import com.ml_utils_system.dto.AuthResponseDto;
import com.ml_utils_system.dto.LoginRequestDto;
import com.ml_utils_system.dto.RegisterRequestDto;
import com.ml_utils_system.exception.ValidationException;
import com.ml_utils_system.model.ERole;
import com.ml_utils_system.model.Role;
import com.ml_utils_system.model.User;
import com.ml_utils_system.repository.RoleRepository;
import com.ml_utils_system.repository.UserRepository;
import com.ml_utils_system.util.CustomLogger;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service class for handling user authentication and registration.
 */
@Service
public class AuthService {

    private static final Logger logger = CustomLogger.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    /**
     * Authenticates a user with the provided credentials and generates a JWT token.
     *
     * @param loginRequest The DTO containing username and password.
     * @return An AuthResponseDto containing the JWT token and user details.
     */
    public AuthResponseDto authenticateUser(LoginRequestDto loginRequest) {
        logger.info("Attempting to authenticate user: {}", loginRequest.getUsername());
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        User userDetails = (User) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        logger.info("User {} authenticated successfully.", loginRequest.getUsername());
        return new AuthResponseDto(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles);
    }

    /**
     * Registers a new user with the provided details.
     *
     * @param signUpRequest The DTO containing username, email, password, and optional roles.
     * @return The registered User entity.
     * @throws ValidationException If the username or email already exists, or roles are invalid.
     */
    @Transactional
    public User registerUser(RegisterRequestDto signUpRequest) {
        logger.info("Attempting to register new user: {}", signUpRequest.getUsername());

        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            logger.warn("Registration failed: Username {} is already taken.", signUpRequest.getUsername());
            throw new ValidationException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            logger.warn("Registration failed: Email {} is already in use.", signUpRequest.getEmail());
            throw new ValidationException("Error: Email is already in use!");
        }

        // Create new user's account
        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new ValidationException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                                .orElseThrow(() -> new ValidationException("Error: Role is not found."));
                        roles.add(adminRole);
                        break;
                    case "user":
                    default:
                        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                                .orElseThrow(() -> new ValidationException("Error: Role is not found."));
                        roles.add(userRole);
                }
            });
        }

        user.setRoles(roles);
        User savedUser = userRepository.save(user);
        logger.info("User {} registered successfully with roles: {}", savedUser.getUsername(), roles.stream().map(r -> r.getName().name()).collect(Collectors.joining(", ")));
        return savedUser;
    }
}
```