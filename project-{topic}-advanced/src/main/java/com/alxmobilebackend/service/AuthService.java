```java
package com.alxmobilebackend.service;

import com.alxmobilebackend.dto.AuthRequest;
import com.alxmobilebackend.dto.AuthResponse;
import com.alxmobilebackend.dto.RegisterRequest;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.model.Role;
import com.alxmobilebackend.model.User;
import com.alxmobilebackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ValidationException("Username is already taken!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ValidationException("Email is already in use!");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Collections.singleton(Role.ROLE_USER)) // Default role for new users
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail()); // Load by email for JWT
        String jwtToken = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .accessToken(jwtToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse authenticate(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        // If authentication is successful, Spring Security sets the authenticated user in the context.
        // We can then generate a token for this user.
        // UserDetails from CustomUserDetailsService uses email as username in SecurityContext
        String principalUsername = authentication.getName();
        UserDetails userDetails = userDetailsService.loadUserByUsername(principalUsername);
        User user = userRepository.findByEmail(principalUsername)
                .or(() -> userRepository.findByUsername(principalUsername)) // Fallback if email not used as principal
                .orElseThrow(() -> new ValidationException("Authenticated user not found in database."));

        String jwtToken = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .accessToken(jwtToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .userId(user.getId())
                .build();
    }
}
```