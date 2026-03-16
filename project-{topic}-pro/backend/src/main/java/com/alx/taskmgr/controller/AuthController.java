package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.auth.JwtResponse;
import com.alx.taskmgr.dto.auth.LoginRequest;
import com.alx.taskmgr.dto.user.UserCreateRequest;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.service.JwtService;
import com.alx.taskmgr.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

/**
 * REST Controller for user authentication and registration.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    /**
     * Registers a new user.
     * @param request UserCreateRequest DTO.
     * @return ResponseEntity with the created user's details.
     */
    @PostMapping("/signup")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody UserCreateRequest request) {
        UserResponse newUser = userService.registerUser(request);
        return new ResponseEntity<>(newUser, HttpStatus.CREATED);
    }

    /**
     * Authenticates a user and returns a JWT token.
     * @param request LoginRequest DTO.
     * @return ResponseEntity with JwtResponse containing the token and user details.
     */
    @PostMapping("/signin")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest request) {
        // Authenticate the user with Spring Security's AuthenticationManager
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        // Set the authenticated user in the security context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate JWT token
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String jwt = jwtService.generateToken(userDetails);

        // Retrieve full user object to get ID and email
        com.alx.taskmgr.entity.User user = userService.getUserByUsername(userDetails.getUsername());

        // Extract roles for the response
        String roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        // Return JWT response
        return ResponseEntity.ok(new JwtResponse(jwt, "Bearer", user.getId(), user.getUsername(), user.getEmail(), roles));
    }
}