```java
package com.alx.eventmanagement.auth.controller;

import com.alx.eventmanagement.auth.dto.AuthRequest;
import com.alx.eventmanagement.auth.dto.JwtResponse;
import com.alx.eventmanagement.auth.dto.RegisterRequest;
import com.alx.eventmanagement.auth.service.AuthService;
import com.alx.eventmanagement.user.dto.UserDTO;
import com.alx.eventmanagement.util.MapperUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication & Registration", description = "API for user authentication and registration")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a new user",
            responses = {
                    @ApiResponse(responseCode = "201", description = "User registered successfully",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserDTO.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid input or user already exists")
            })
    @PostMapping("/register")
    public ResponseEntity<UserDTO> registerUser(@Valid @RequestBody RegisterRequest request) {
        log.info("Attempting to register user: {}", request.getUsername());
        UserDTO registeredUser = MapperUtil.toUserDTO(authService.registerUser(request));
        log.info("User {} registered successfully.", registeredUser.getUsername());
        return new ResponseEntity<>(registeredUser, HttpStatus.CREATED);
    }

    @Operation(summary = "Authenticate user and get JWT token",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Authentication successful, JWT token returned",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = JwtResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Invalid credentials")
            })
    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody AuthRequest authRequest) {
        log.info("Attempting to authenticate user: {}", authRequest.getUsername());
        JwtResponse jwtResponse = authService.authenticateUser(authRequest);
        return ResponseEntity.ok(jwtResponse);
    }
}
```