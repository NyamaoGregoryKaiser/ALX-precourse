package com.appinsight.appinsight.controller;

import com.appinsight.appinsight.dto.AuthRequest;
import com.appinsight.appinsight.dto.AuthResponse;
import com.appinsight.appinsight.dto.RegisterRequest;
import com.appinsight.appinsight.model.User;
import com.appinsight.appinsight.service.JwtUserDetailsService;
import com.appinsight.appinsight.service.UserService;
import com.appinsight.appinsight.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final JwtUserDetailsService userDetailsService;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        log.info("Attempting to register new user: {}", request.getUsername());
        try {
            User newUser = userService.registerNewUser(
                    request.getUsername(),
                    request.getPassword(),
                    request.getEmail(),
                    request.getRoles()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body("User registered successfully: " + newUser.getUsername());
        } catch (IllegalArgumentException e) {
            log.warn("User registration failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error during user registration: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Registration failed due to an internal error.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> createAuthenticationToken(@Valid @RequestBody AuthRequest authenticationRequest) throws Exception {
        log.debug("Attempting to authenticate user: {}", authenticationRequest.getUsername());
        authenticate(authenticationRequest.getUsername(), authenticationRequest.getPassword());

        final UserDetails userDetails = userDetailsService
                .loadUserByUsername(authenticationRequest.getUsername());

        final String token = jwtUtil.generateToken(userDetails);

        log.info("User {} authenticated successfully.", authenticationRequest.getUsername());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    private void authenticate(String username, String password) throws Exception {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (DisabledException e) {
            log.warn("Authentication failed for user {}: User disabled.", username);
            throw new Exception("USER_DISABLED", e);
        } catch (BadCredentialsException e) {
            log.warn("Authentication failed for user {}: Invalid credentials.", username);
            throw new BadCredentialsException("INVALID_CREDENTIALS", e);
        }
    }
}