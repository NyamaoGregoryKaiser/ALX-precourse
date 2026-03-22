package com.alx.auth.system.controller;

import com.alx.auth.system.data.dto.UpdateUserRequest;
import com.alx.auth.system.data.dto.UserResponse;
import com.alx.auth.system.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing user profiles and (for ADMINs) viewing/managing all users.
 *
 * @RequiredArgsConstructor: Lombok annotation to generate a constructor with required arguments.
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 * @Tag: Swagger annotation for API grouping.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "API for managing user profiles and users (admin only)")
public class UserController {

    private final UserService userService;

    /**
     * Retrieves the profile of the currently authenticated user.
     *
     * @param authentication The Spring Security Authentication object containing principal details.
     * @return ResponseEntity with the UserResponse of the authenticated user.
     */
    @Operation(summary = "Get current user profile",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User profile retrieved successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = UserResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            })
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Ensure only authenticated users can access their profile
    public ResponseEntity<UserResponse> getMyProfile(Authentication authentication) {
        String email = authentication.getName(); // Get email from authenticated principal
        log.info("Fetching profile for user: {}", email);
        UserResponse user = userService.findUserByEmail(email);
        return ResponseEntity.ok(user);
    }

    /**
     * Updates the profile of the currently authenticated user.
     *
     * @param authentication The Spring Security Authentication object.
     * @param request The UpdateUserRequest containing fields to update.
     * @return ResponseEntity with the updated UserResponse.
     */
    @Operation(summary = "Update current user profile",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User profile updated successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = UserResponse.class))),
                    @ApiResponse(responseCode = "400", description = "Invalid input"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            })
    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<UserResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        String email = authentication.getName();
        log.info("Updating profile for user: {}", email);
        UserResponse updatedUser = userService.updateUser(email, request);
        log.info("User profile updated for: {}", email);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Retrieves a list of all users. This endpoint is restricted to ADMIN users.
     *
     * @return ResponseEntity with a list of all UserResponse objects.
     */
    @Operation(summary = "Get all users (Admin only)",
            responses = {
                    @ApiResponse(responseCode = "200", description = "List of all users retrieved",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = UserResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role")
            })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can list all users
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        log.info("Admin fetching all users.");
        List<UserResponse> users = userService.findAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * Retrieves a specific user by their ID. This endpoint is restricted to ADMIN users.
     *
     * @param id The ID of the user to retrieve.
     * @return ResponseEntity with the UserResponse of the requested user.
     */
    @Operation(summary = "Get user by ID (Admin only)",
            responses = {
                    @ApiResponse(responseCode = "200", description = "User retrieved successfully",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = UserResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        log.info("Admin fetching user with ID: {}", id);
        UserResponse user = userService.findUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * Deletes a user by their ID. This endpoint is restricted to ADMIN users.
     *
     * @param id The ID of the user to delete.
     * @return ResponseEntity indicating success of the deletion.
     */
    @Operation(summary = "Delete user by ID (Admin only)",
            responses = {
                    @ApiResponse(responseCode = "204", description = "User deleted successfully"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role"),
                    @ApiResponse(responseCode = "404", description = "User not found")
            })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Admin deleting user with ID: {}", id);
        userService.deleteUser(id);
        log.info("User with ID: {} deleted.", id);
        return ResponseEntity.noContent().build();
    }
}