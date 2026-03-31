```java
package com.ml_utils_system.controller;

import com.ml_utils_system.dto.AuthResponseDto;
import com.ml_utils_system.dto.LoginRequestDto;
import com.ml_utils_system.dto.RegisterRequestDto;
import com.ml_utils_system.dto.UserDto;
import com.ml_utils_system.model.User;
import com.ml_utils_system.service.AuthService;
import com.ml_utils_system.util.CustomLogger;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.stream.Collectors;

/**
 * REST Controller for user authentication and registration.
 * Handles public endpoints related to user access.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "API for user authentication and registration")
public class AuthController {

    private static final Logger logger = CustomLogger.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Handles user login requests.
     *
     * @param loginRequest The DTO containing username and password.
     * @return A ResponseEntity with AuthResponseDto (JWT token) and HTTP status 200 OK.
     */
    @Operation(summary = "Authenticate user and get JWT token")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User authenticated successfully",
                    content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                    content = @Content),
            @ApiResponse(responseCode = "400", description = "Invalid request payload",
                    content = @Content)
    })
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> authenticateUser(@Valid @RequestBody LoginRequestDto loginRequest) {
        logger.info("Received login request for user: {}", loginRequest.getUsername());
        AuthResponseDto response = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Handles user registration requests.
     *
     * @param signUpRequest The DTO containing new user details.
     * @return A ResponseEntity with UserDto of the registered user and HTTP status 201 Created.
     */
    @Operation(summary = "Register a new user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User registered successfully",
                    content = @Content(schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or user already exists",
                    content = @Content)
    })
    @PostMapping("/register")
    public ResponseEntity<UserDto> registerUser(@Valid @RequestBody RegisterRequestDto signUpRequest) {
        logger.info("Received registration request for user: {}", signUpRequest.getUsername());
        User newUser = authService.registerUser(signUpRequest);
        return new ResponseEntity<>(convertToDto(newUser), HttpStatus.CREATED);
    }

    /**
     * Converts a {@link User} entity to a {@link UserDto}.
     *
     * @param user The User entity.
     * @return The corresponding UserDto.
     */
    private UserDto convertToDto(User user) {
        UserDto dto = new UserDto();
        BeanUtils.copyProperties(user, dto, "password"); // Exclude password from DTO
        dto.setRoles(user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet()));
        return dto;
    }
}
```