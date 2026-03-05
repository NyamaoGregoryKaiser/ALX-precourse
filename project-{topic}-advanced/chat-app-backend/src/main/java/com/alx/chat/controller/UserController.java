```java
package com.alx.chat.controller;

import com.alx.chat.dto.user.UpdateUserRequest;
import com.alx.chat.dto.user.UserDto;
import com.alx.chat.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth") // Mark all endpoints in this controller as requiring JWT
@Tag(name = "User Management", description = "Operations related to user profiles")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user's profile",
            description = "Retrieves the profile details of the currently authenticated user.")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        UserDto user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id") // Admin or owner can view
    @Operation(summary = "Get user by ID",
            description = "Retrieves user profile details by their ID. Accessible by ADMIN or the user themselves.")
    public ResponseEntity<UserDto> getUserById(@Parameter(description = "ID of the user to retrieve") @PathVariable Long userId) {
        UserDto user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{userId}")
    @PreAuthorize("#userId == authentication.principal.id") // Only owner can update
    @Operation(summary = "Update user profile",
            description = "Updates the profile details of a user. Only accessible by the user themselves.")
    public ResponseEntity<UserDto> updateUser(@Parameter(description = "ID of the user to update") @PathVariable Long userId,
                                              @Valid @RequestBody UpdateUserRequest request,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        // userDetails.getUsername() is the original username from JWT token
        UserDto updatedUser = userService.updateUser(userId, request, userDetails.getUsername());
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id") // Admin or owner can delete
    @Operation(summary = "Delete user",
            description = "Deletes a user account. Accessible by ADMIN or the user themselves.")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "ID of the user to delete") @PathVariable Long userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}
```