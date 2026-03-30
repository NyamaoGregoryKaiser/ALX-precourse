```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.AuthRequest;
import com.alx.devops.productmanagement.dto.AuthResponse;
import com.alx.devops.productmanagement.dto.UserDTO;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.model.Role;
import com.alx.devops.productmanagement.model.User;
import com.alx.devops.productmanagement.repository.UserRepository;
import com.alx.devops.productmanagement.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    @Transactional
    public UserDTO registerUser(UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new ValidationException("Username " + userDTO.getUsername() + " already exists.");
        }

        User user = new User();
        user.setUsername(userDTO.getUsername());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        // Default new users to ROLE_USER
        user.setRole(Role.ROLE_USER);

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: {}", savedUser.getUsername());

        UserDTO responseDTO = new UserDTO();
        responseDTO.setId(savedUser.getId());
        responseDTO.setUsername(savedUser.getUsername());
        responseDTO.setRole(savedUser.getRole());
        return responseDTO;
    }

    public AuthResponse login(AuthRequest authRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.getUsername(), authRequest.getPassword())
            );

            // If authentication is successful, generate JWT token
            UserDetails userDetails = userDetailsService.loadUserByUsername(authRequest.getUsername());
            String jwt = jwtUtil.generateToken(userDetails);

            User user = userRepository.findByUsername(authRequest.getUsername())
                    .orElseThrow(() -> new ValidationException("User not found after authentication?"));

            log.info("User logged in successfully: {}", authRequest.getUsername());
            return new AuthResponse(jwt, user.getUsername(), user.getRole().name());
        } catch (AuthenticationException e) {
            log.warn("Authentication failed for user {}: {}", authRequest.getUsername(), e.getMessage());
            throw new ValidationException("Invalid username or password");
        }
    }
}
```