```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.AuthRequest;
import com.alx.taskmgr.dto.AuthResponse;
import com.alx.taskmgr.exception.UserAlreadyExistsException;
import com.alx.taskmgr.model.Role;
import com.alx.taskmgr.model.User;
import com.alx.taskmgr.repository.UserRepository;
import com.alx.taskmgr.security.JwtService;
import com.alx.taskmgr.security.UserInfo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User registration and login APIs")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody AuthRequest authRequest) {
        if (userRepository.existsByUsername(authRequest.getUsername())) {
            throw new UserAlreadyExistsException("Username is already taken!");
        }

        if (userRepository.existsByEmail(authRequest.getEmail())) {
            throw new UserAlreadyExistsException("Email is already in use!");
        }

        User user = User.builder()
                .username(authRequest.getUsername())
                .email(authRequest.getEmail())
                .password(passwordEncoder.encode(authRequest.getPassword()))
                .role(Role.ROLE_USER) // Default role
                .build();

        userRepository.save(user);
        return new ResponseEntity<>("User registered successfully!", HttpStatus.CREATED);
    }

    @Operation(summary = "Authenticate user and get JWT token")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody AuthRequest authRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRequest.getUsername(),
                        authRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtService.generateToken(authentication);

        UserInfo userDetails = (UserInfo) authentication.getPrincipal();
        return ResponseEntity.ok(new AuthResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                userDetails.getRole().name()));
    }
}
```