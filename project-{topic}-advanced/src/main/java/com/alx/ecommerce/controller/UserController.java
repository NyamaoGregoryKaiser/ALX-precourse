```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.UserDTOs;
import com.alx.ecommerce.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management operations")
@SecurityRequirement(name = "bearerAuth") // Indicates this controller requires JWT
@Slf4j
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get current authenticated user's profile",
               description = "Retrieves the profile information of the user making the request.")
    @GetMapping("/me")
    public ResponseEntity<UserDTOs.UserResponse> getAuthenticatedUser(@AuthenticationPrincipal UserDetails userDetails) {
        log.debug("Fetching profile for authenticated user: {}", userDetails.getUsername());
        UserDTOs.UserResponse user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Get user by ID (Admin only)",
               description = "Retrieves user details by ID. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTOs.UserResponse> getUserById(@Parameter(description = "ID of the user to retrieve") @PathVariable UUID id) {
        log.debug("Admin fetching user by ID: {}", id);
        UserDTOs.UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Get all users (Admin only)",
               description = "Retrieves a list of all users. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserDTOs.UserResponse>> getAllUsers() {
        log.debug("Admin fetching all users.");
        List<UserDTOs.UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @Operation(summary = "Update current authenticated user's profile",
               description = "Updates the profile information of the authenticated user.")
    @PutMapping("/me")
    public ResponseEntity<UserDTOs.UserResponse> updateAuthenticatedUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserDTOs.UpdateUserRequest request) {
        log.info("Updating profile for authenticated user: {}", userDetails.getUsername());
        // In a real application, you might want to fetch the user by their ID, not just username for safety
        // Assuming userDetails provides a way to get the ID, or fetch full user object from UserDetailsService
        UUID userId = userService.getUserByUsername(userDetails.getUsername()).getId();
        UserDTOs.UserResponse updatedUser = userService.updateUser(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @Operation(summary = "Update user by ID (Admin only)",
               description = "Updates user details by ID. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTOs.UserResponse> updateUser(@Parameter(description = "ID of the user to update") @PathVariable UUID id,
                                                        @Valid @RequestBody UserDTOs.UpdateUserRequest request) {
        log.info("Admin updating user with ID: {}", id);
        UserDTOs.UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @Operation(summary = "Delete user by ID (Admin only)",
               description = "Deletes a user by ID. Requires ADMIN role.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "ID of the user to delete") @PathVariable UUID id) {
        log.info("Admin deleting user with ID: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
```