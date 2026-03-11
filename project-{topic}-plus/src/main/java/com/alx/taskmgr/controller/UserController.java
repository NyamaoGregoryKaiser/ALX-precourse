```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing user profiles.
 * Provides endpoints to retrieve user information.
 * Some operations are restricted to ADMIN role.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth") // Indicates that this endpoint requires authentication
@Tag(name = "Users", description = "Operations related to user profiles")
public class UserController {

    private final UserService userService;

    /**
     * Retrieves the profile of the authenticated user.
     *
     * @param authentication The Spring Security Authentication object.
     * @return ResponseEntity with the UserResponse of the current user.
     */
    @Operation(summary = "Get authenticated user's profile",
               responses = {
                   @ApiResponse(responseCode = "200", description = "User profile retrieved successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "404", description = "User not found")
               })
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<UserResponse> getMyProfile(Authentication authentication) {
        String userEmail = authentication.getName();
        UserResponse response = userService.getUserProfileByEmail(userEmail);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves a user's profile by their ID.
     * This endpoint is restricted to users with the ADMIN role.
     *
     * @param id The ID of the user to retrieve.
     * @return ResponseEntity with the UserResponse of the specified user.
     */
    @Operation(summary = "Get user profile by ID (Admin only)",
               responses = {
                   @ApiResponse(responseCode = "200", description = "User profile retrieved successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Requires ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "User not found")
               })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserProfileById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves a list of all registered users.
     * This endpoint is restricted to users with the ADMIN role.
     *
     * @return ResponseEntity with a list of UserResponse for all users.
     */
    @Operation(summary = "Get all users (Admin only)",
               responses = {
                   @ApiResponse(responseCode = "200", description = "All user profiles retrieved successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = UserResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Requires ADMIN role")
               })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
}
```